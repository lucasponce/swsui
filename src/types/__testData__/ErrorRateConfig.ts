export const serverRateConfig = {
  kialiFeatureFlags: {
    istioInjectionAction: true
  },
  healthConfig: {
    rate: [
      {
        namespace: new RegExp('bookinfo'),
        kind: new RegExp('app'),
        name: new RegExp('reviews'),
        tolerance: [
          {
            code: new RegExp('4dd'),
            degraded: 20,
            failure: 30,
            protocol: new RegExp('http'),
            direction: new RegExp('inbound')
          }
        ]
      }
    ]
  },
  installationTag: 'Kiali Console',
  istioAnnotations: {
    istioInjectionAnnotation: ''
  },
  istioIdentityDomain: 'svc.cluster.local',
  istioNamespace: 'istio-system',
  istioComponentNamespaces: new Map<string, string>(),
  istioLabels: {
    appLabelName: 'app',
    injectionLabelName: 'istio-injection',
    versionLabelName: 'version'
  },
  prometheus: {
    globalScrapeInterval: 15,
    storageTsdbRetention: 21600
  },
  durations: {},
  istioTelemetryV2: true
};

export const tolerancesDefault = [
  {
    code: new RegExp(/^[4-5]\d\d$/),
    protocol: new RegExp('http'),
    direction: new RegExp('.*'),
    degraded: 0.1,
    failure: 20
  },
  {
    code: new RegExp(/^[1-9]$|^1[0-6]$/),
    protocol: new RegExp('grpc'),
    direction: new RegExp('.*'),
    degraded: 0.1,
    failure: 20
  }
];
