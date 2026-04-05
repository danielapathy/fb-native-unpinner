Java.perform(function() {
    try {
        var TrustManagerImpl = Java.use("com.android.org.conscrypt.TrustManagerImpl");
        TrustManagerImpl.verifyChain.implementation = function() { return arguments[0]; };
        TrustManagerImpl.checkTrustedRecursive.implementation = function() {
            return Java.use("java.util.ArrayList").$new();
        };
        console.log("[+] Hooked TrustManagerImpl");
    } catch(e) { console.log("[-] TrustManagerImpl: " + e); }

    function hookColdstart() {
        var lib = Process.findModuleByName("libcoldstart.so");
        if (!lib) {
            setTimeout(hookColdstart, 500);
            return;
        }
        console.log("[+] libcoldstart.so found at " + lib.base);

        var verify = lib.findExportByName("_ZN8proxygen15SSLVerification17verifyWithMetricsEbP17x509_store_ctx_stRKNSt6__ndk212basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEEPNS0_31SSLFailureVerificationCallbacksEPNS0_31SSLSuccessVerificationCallbacksERKNS_15TimeUtilGenericINS3_6chrono12steady_clockEEERNS_10TraceEventERKNS_16SSLVerifyOptionsE");
        if (verify) {
            Interceptor.attach(verify, { onLeave: function(retval) { retval.replace(1); } });
            console.log("[+] Hooked verifyWithMetrics");
        } else {
            console.log("[-] verifyWithMetrics not found");
        }
    }

    setTimeout(hookColdstart, 2000);
});
