
const __mfCacheGlobalKey = "__mf_module_cache__";
globalThis[__mfCacheGlobalKey] ||= { share: {}, remote: {} };
globalThis[__mfCacheGlobalKey].share ||= {};
globalThis[__mfCacheGlobalKey].remote ||= {};
const __mfModuleCache = globalThis[__mfCacheGlobalKey];
const __mfTrackPendingShareLoad = (promise) => {
  const pendingShareLoads = (__mfModuleCache.pendingShareLoads ||= []);
  pendingShareLoads.push(promise);
  const cleanup = () => {
    const index = pendingShareLoads.indexOf(promise);
    if (index !== -1) pendingShareLoads.splice(index, 1);
  };
  void promise.then(cleanup, cleanup);
  return promise;
};
for (const __mfShareKey of Object.keys(__mfModuleCache.share)) {
  if (__mfShareKey.startsWith("default:")) {
    const __mfLegacyShareKey = __mfShareKey.slice("default:".length);
    if (__mfModuleCache.share[__mfLegacyShareKey] === undefined) {
      __mfModuleCache.share[__mfLegacyShareKey] = __mfModuleCache.share[__mfShareKey];
    }
  } else if (!__mfShareKey.includes(":")) {
    const __mfDefaultShareKey = "default:" + __mfShareKey;
    if (__mfModuleCache.share[__mfDefaultShareKey] === undefined) {
      __mfModuleCache.share[__mfDefaultShareKey] = __mfModuleCache.share[__mfShareKey];
    }
  }
}

const __mfImport = (src) =>
  globalThis.System && typeof globalThis.System.import === 'function'
    ? globalThis.System.import(src)
    : import(src);


const __mfRemoteEntryPrefetchUrls = ["http://shell.invalid/remoteEntry.js"];
for (const __mfRemoteEntryPrefetchUrl of __mfRemoteEntryPrefetchUrls) {
  import(/* @vite-ignore */ __mfRemoteEntryPrefetchUrl).catch(() => {});
}


(async () => {
  const __mfHostInit = await __mfImport("./hostInit-CExNTtPT.js");
  await __mfHostInit.__tla;
  const { initHost } = __mfHostInit;
  
  const runtime = await initHost();
  const __mfPreloadRemote = (runtimeRemote, remote, registration) => {
    if (registration && typeof runtime.registerRemotes === "function") {
      runtime.registerRemotes([registration]);
    }
    const remoteCacheKey = "virtual:mf:__mfe_internal__enrollment__mf_owner__227361110711511__mf_v__runtimeInit__mf_v__.js::" + remote;
    const pendingKey = "__mf_pending__" + remoteCacheKey;
    if (!__mfModuleCache.remote[pendingKey]) {
      __mfModuleCache.remote[pendingKey] = runtime.loadRemote(runtimeRemote)
        .then((mod) => {
          __mfModuleCache.remote[remoteCacheKey] = mod;
          delete __mfModuleCache.remote[pendingKey];
          return mod;
        })
        .catch((error) => {
          delete __mfModuleCache.remote[pendingKey];
          throw error;
        });
    }
    return __mfModuleCache.remote[pendingKey];
  };
  const __mfRemotePreloads = [__mfPreloadRemote("__mfe_internal__enrollment__mf_owner__227361110711511__shell/apiClient", "shell/apiClient", {"entryGlobalName":"shell","name":"__mfe_internal__enrollment__mf_owner__227361110711511__shell","alias":"shell","type":"module","entry":"http://shell.invalid/remoteEntry.js","shareScope":"default"}),__mfPreloadRemote("__mfe_internal__enrollment__mf_owner__227361110711511__shell/session", "shell/session", {"entryGlobalName":"shell","name":"__mfe_internal__enrollment__mf_owner__227361110711511__shell","alias":"shell","type":"module","entry":"http://shell.invalid/remoteEntry.js","shareScope":"default"})];
  await Promise.all(__mfRemotePreloads);
  const __mfPendingShares = await __mfImport("./pendingShares-ewmN0w9V.js").catch(() => undefined);
  if (__mfPendingShares && typeof __mfPendingShares.preloadPendingShares === "function") await __mfPendingShares.preloadPendingShares();
  if (__mfModuleCache.pendingShareLoads) {
    await Promise.all(__mfModuleCache.pendingShareLoads);
  }
  const __mfReactServerModuleCache = globalThis["__mf_module_cache_react_server__"];
  if (__mfReactServerModuleCache?.pendingShareLoads) {
    await Promise.all(__mfReactServerModuleCache.pendingShareLoads);
  }
})().then(() => __mfImport("./index-BtEAPyh-.js"));
