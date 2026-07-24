import { InterstitialAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';

let interstitial: InterstitialAd | null = null;
let isAdLoaded = false;

export const loadInterstitialAd = () => {
  if (interstitial && isAdLoaded) return;

  const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-5258115024282608/4715413239'

  interstitial = InterstitialAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    isAdLoaded = true;
  });

  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    isAdLoaded = false;
    interstitial = null;
    loadInterstitialAd(); // Preload next ad
  });

  interstitial.load();
};

export const showInterstitialAd = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!interstitial || !isAdLoaded) {
      resolve();
      return;
    }

    // When closed, resolve the promise so the app can continue
    const unsubscribe = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribe();
      resolve();
    });

    interstitial.show();
  });
};
