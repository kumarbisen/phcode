package com.phcode

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.util.TimeZone
import kotlin.concurrent.thread

class LocalTerminalModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private data class RuntimeArchitecture(
        val abi: String,
        val assetDirectory: String,
        val displayName: String,
    )

    private val runtimeArchitectures = mapOf(
        "arm64-v8a" to RuntimeArchitecture("arm64-v8a", "arm64", "ARM64"),
        "armeabi-v7a" to RuntimeArchitecture("armeabi-v7a", "arm32", "ARMv7"),
        "x86_64" to RuntimeArchitecture("x86_64", "x64", "x86_64"),
    )

    private var process: Process? = null
    private var outputStream: OutputStream? = null
    private val commandQueue = mutableListOf<String>()

    override fun getName(): String {
        return "LocalTerminalModule"
    }

    private fun resolveArchitecture(): RuntimeArchitecture {
        for (abi in Build.SUPPORTED_ABIS) {
            runtimeArchitectures[abi]?.let { return it }
        }

        throw Exception(
            "Unsupported CPU architecture: ${Build.SUPPORTED_ABIS.joinToString(", ")}",
        )
    }

    private fun copyAsset(assetPath: String, destFile: File, overwrite: Boolean = false) {
        if (destFile.exists() && !overwrite) return

        destFile.parentFile?.mkdirs()
        destFile.delete()
        reactApplicationContext.assets.open(assetPath).use { inputStream ->
            FileOutputStream(destFile).use { outputStream ->
                inputStream.copyTo(outputStream)
            }
        }
    }

    private fun extractLibraryFromApk(libraryName: String, destFile: File): Boolean {
        val appInfo = reactApplicationContext.applicationInfo
        val apkPaths = mutableListOf<String>()
        apkPaths.add(appInfo.sourceDir)
        appInfo.splitSourceDirs?.let {
            apkPaths.addAll(it)
        }

        val architecture = resolveArchitecture().abi
        val zipEntryPath = "lib/$architecture/$libraryName"

        for (apkPath in apkPaths) {
            try {
                java.util.zip.ZipFile(apkPath).use { zip ->
                    val entry = zip.getEntry(zipEntryPath)
                    if (entry != null) {
                        destFile.parentFile?.mkdirs()
                        destFile.delete()
                        zip.getInputStream(entry).use { inputStream ->
                            FileOutputStream(destFile).use { outputStream ->
                                inputStream.copyTo(outputStream)
                            }
                        }
                        destFile.setReadable(true, true)
                        destFile.setExecutable(true, true)
                        return true
                    }
                }
            } catch (e: Exception) {
                // Ignore and try the next APK
            }
        }
        return false
    }

    private fun copyNativeExecutable(nativeLibraryDir: String, libraryName: String, destFile: File) {
        val sourceFile = File(nativeLibraryDir, libraryName)
        if (!sourceFile.exists()) {
            if (!extractLibraryFromApk(libraryName, destFile)) {
                throw Exception("Runtime binary missing: ${sourceFile.absolutePath} and not found in APKs")
            }
            return
        }

        val shouldCopy = !destFile.exists() || destFile.length() != sourceFile.length()
        if (shouldCopy) {
            destFile.parentFile?.mkdirs()
            destFile.delete()
            FileInputStream(sourceFile).use { inputStream ->
                FileOutputStream(destFile).use { outputStream ->
                    inputStream.copyTo(outputStream)
                }
            }
        }

        destFile.setReadable(true, true)
        destFile.setExecutable(true, true)
    }

    private fun emitData(data: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onTerminalData", data)
    }

    private fun shellQuote(value: String): String {
        return "'" + value.replace("'", "'\"'\"'") + "'"
    }

    private fun setupEnvironment(env: MutableMap<String, String>, filesDir: File, nativeLibraryDir: String) {
        env["PREFIX"] = filesDir.absolutePath
        env["NATIVE_DIR"] = nativeLibraryDir
        env["ANDROID_TZ"] = TimeZone.getDefault().id
        env["FDROID"] = "false"
        env["LD_LIBRARY_PATH"] = "$nativeLibraryDir:${filesDir.absolutePath}"
    }

    private fun drainOutput(stream: InputStream) {
        val reader = java.io.InputStreamReader(stream, Charsets.UTF_8)
        val buffer = CharArray(4096)
        var read: Int
        while (reader.read(buffer).also { read = it } != -1) {
            emitData(String(buffer, 0, read))
        }
    }

    private fun runProcess(
        args: List<String>,
        filesDir: File? = null,
        nativeLibraryDir: String? = null,
        workingDirectory: File? = null,
    ): Int {
        val processBuilder = ProcessBuilder(args.toMutableList())
        if (filesDir != null && nativeLibraryDir != null) {
            setupEnvironment(processBuilder.environment(), filesDir, nativeLibraryDir)
        }
        if (workingDirectory != null) {
            processBuilder.directory(workingDirectory)
        }
        processBuilder.redirectErrorStream(true)

        val localProcess = processBuilder.start()
        drainOutput(localProcess.inputStream)
        return localProcess.waitFor()
    }

    private fun writeRuntimeScripts(filesDir: File, nativeLibraryDir: String) {
        val initSandbox = File(filesDir, "init-sandbox.sh")
        val initAlpine = File(filesDir, "init-alpine.sh")

        copyAsset("init-sandbox.sh", initSandbox, overwrite = true)
        copyAsset("init-alpine.sh", initAlpine, overwrite = true)

        initSandbox.setExecutable(true, true)
        initAlpine.setExecutable(true, true)

        copyNativeExecutable(nativeLibraryDir, "libaxs.so", File(filesDir, "axs"))
    }

    private fun installRmWrapper(rootfsDir: File) {
        val rmWrapper = File(rootfsDir, "bin/rm")
        if (File(rootfsDir, "bin").exists()) {
            copyAsset("rm-wrapper.sh", rmWrapper, overwrite = true)
            rmWrapper.setExecutable(true, true)
        }
    }

    private fun extractRootfs(rootfsTar: File, rootfsDir: File) {
        var exitCode = runProcess(
            listOf("tar", "--no-same-owner", "-xf", rootfsTar.absolutePath, "-C", rootfsDir.absolutePath),
        )

        if (exitCode != 0) {
            emitData("tar --no-same-owner failed with code $exitCode; retrying with gzip flags.\r\n")
            rootfsDir.deleteRecursively()
            rootfsDir.mkdirs()
            exitCode = runProcess(
                listOf("tar", "-xzf", rootfsTar.absolutePath, "-C", rootfsDir.absolutePath),
            )
        }

        if (exitCode != 0) {
            throw Exception("Root filesystem extraction failed with code $exitCode")
        }
    }

    private fun configureRootfs(filesDir: File, rootfsDir: File) {
        val resolvConf = File(rootfsDir, "etc/resolv.conf")
        resolvConf.parentFile?.mkdirs()
        resolvConf.delete()
        resolvConf.writeText("nameserver 8.8.8.8\nnameserver 1.1.1.1\n")

        File(filesDir, "public").mkdirs()
        File(rootfsDir, "tmp").mkdirs()
        installRmWrapper(rootfsDir)
    }

    private fun runSandboxSetup(filesDir: File, nativeLibraryDir: String): Int {
        val initSandbox = File(filesDir, "init-sandbox.sh")
        val command = ". ${shellQuote(initSandbox.absolutePath)} --installing"
        return runProcess(
            listOf("sh", "-c", command),
            filesDir = filesDir,
            nativeLibraryDir = nativeLibraryDir,
        )
    }

    private fun prepareRuntime(filesDir: File, nativeLibraryDir: String) {
        val architecture = resolveArchitecture()
        val rootfsDir = File(filesDir, "alpine")
        val rootfsTar = File(filesDir, "alpine.tar.gz")
        val architectureMarker = File(filesDir, ".phcode_runtime_arch")
        val configuredMarker = File(filesDir, ".configured")

        writeRuntimeScripts(filesDir, nativeLibraryDir)

        val currentMarker = if (architectureMarker.exists()) {
            architectureMarker.readText().trim()
        } else {
            ""
        }

        val needsExtract =
            currentMarker != architecture.abi ||
                !rootfsDir.exists() ||
                !File(rootfsDir, "etc/alpine-release").exists()

        if (needsExtract) {
            emitData("\r\nInstalling Terminal Environment for ${architecture.displayName}...\r\n")
            emitData("Setting up directories...\r\n")

            rootfsDir.deleteRecursively()
            configuredMarker.deleteRecursively()
            rootfsDir.mkdirs()

            emitData("Extracting sandbox filesystem...\r\n")
            copyAsset(
                "alpine_assets/${architecture.assetDirectory}/alpine.rootfs",
                rootfsTar,
                overwrite = true,
            )
            extractRootfs(rootfsTar, rootfsDir)
            configureRootfs(filesDir, rootfsDir)

            File(filesDir, ".downloaded").mkdirs()
            File(filesDir, ".extracted").mkdirs()
            architectureMarker.writeText(architecture.abi)
            emitData("Extraction complete.\r\n")
        } else {
            configureRootfs(filesDir, rootfsDir)
        }

        if (!configuredMarker.exists()) {
            emitData("Configuring sandbox environment...\r\n")
            val exitCode = runSandboxSetup(filesDir, nativeLibraryDir)
            if (exitCode != 0) {
                emitData("Sandbox setup exited with code $exitCode. Starting shell anyway.\r\n")
            }
        }
    }

    private fun flushCommandQueue() {
        synchronized(commandQueue) {
            commandQueue.forEach { command ->
                try {
                    outputStream?.write(command.toByteArray())
                    outputStream?.flush()
                } catch (_: Exception) {
                }
            }
            commandQueue.clear()
        }
    }

    private fun clearCommandQueue() {
        synchronized(commandQueue) {
            commandQueue.clear()
        }
    }

    @ReactMethod
    fun requestStoragePermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                try {
                    val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                    intent.addCategory("android.intent.category.DEFAULT")
                    intent.data = Uri.parse(String.format("package:%s", reactApplicationContext.packageName))
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    reactApplicationContext.startActivity(intent)
                    promise.resolve(false)
                } catch (e: Exception) {
                    val intent = Intent()
                    intent.action = Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    reactApplicationContext.startActivity(intent)
                    promise.resolve(false)
                }
            } else {
                promise.resolve(true)
            }
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun start() {
        if (process != null) return

        thread(name = "PhCodeTerminal") {
            try {
                val filesDir = reactApplicationContext.filesDir
                val nativeLibraryDir = reactApplicationContext.applicationInfo.nativeLibraryDir

                prepareRuntime(filesDir, nativeLibraryDir)

                val initSandbox = File(filesDir, "init-sandbox.sh")
                val command = ". ${shellQuote(initSandbox.absolutePath)}"
                val processBuilder = ProcessBuilder("sh", "-c", command)
                setupEnvironment(processBuilder.environment(), filesDir, nativeLibraryDir)
                processBuilder.redirectErrorStream(true)

                val localProcess = processBuilder.start()
                process = localProcess
                outputStream = localProcess.outputStream

                flushCommandQueue()
                drainOutput(localProcess.inputStream)

                val exitCode = localProcess.waitFor()
                emitData("\r\n[Process exited with code $exitCode]\r\n")
            } catch (e: Exception) {
                e.printStackTrace()
                emitData("Failed to start Alpine terminal: ${e.message}\r\n")
                emitData("Queued commands were not executed because the runtime is unavailable.\r\n")
                clearCommandQueue()
            } finally {
                process = null
                outputStream = null
            }
        }
    }

    @ReactMethod
    fun write(data: String) {
        if (outputStream == null) {
            synchronized(commandQueue) {
                commandQueue.add(data)
            }
        } else {
            try {
                outputStream?.write(data.toByteArray())
                outputStream?.flush()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @ReactMethod
    fun stop() {
        process?.destroy()
        process = null
        outputStream = null
        clearCommandQueue()
    }
}
