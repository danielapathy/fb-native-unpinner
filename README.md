# fb-native-unpinner

This is a script to help you get around SSL pinning in the Facebook (Katana) app on Android. It specifically targets the native `libcoldstart.so` library so you can actually read the traffic in your proxy without the app crashing on you or blocking requests.

### What you'll need
Before starting, you need a rooted environment. I used a **Google APIs Android 16 (API 36.0)** Pixel 9 Pro emulator installed via [Android Studio](https://developer.android.com/studio/install) Device Manager. To get root access, I launched the emulator with a writable system and used **[rootAVD](https://gitlab.com/newbit/rootAVD)** with the FAKEBOOTIMG option. Note that while Magisk might not show root, you’ll still have `su` access via `adb shell su`.

### 1. Get your certificate ready
You need to grab your `mitmproxy` certificate and format it for the Android system store.

1. Generate the cert by visiting `http://mitm.it` in your emulator browser.
2. Find the cert on your machine (usually at `~/.mitmproxy/mitmproxy-ca-cert.pem`).
3. Get the hash and rename it:

```bash
HASH=$(openssl x509 -inform PEM -subject_hash_old -in ~/.mitmproxy/mitmproxy-ca-cert.pem | head -1)
cp ~/.mitmproxy/mitmproxy-ca-cert.pem ${HASH}.0
```

### 2. Push and Inject the Certificate
Since modern Android (14+) is protective of the cert store, we have to manually mount it into the filesystem. Push the `${HASH}.0` file to `/sdcard/` first, then run this in `adb shell su`:

```bash
# Setup the temporary mount
mount -t tmpfs tmpfs /system/etc/security/cacerts
cp /apex/com.android.conscrypt/cacerts/* /system/etc/security/cacerts/
cp /sdcard/YOUR_HASH_HERE.0 /system/etc/security/cacerts/
chmod 644 /system/etc/security/cacerts/*
chcon u:object_r:system_file:s0 /system/etc/security/cacerts/*

# Inject into the zygote namespaces
ZYGOTE_PID=$(pidof zygote || true)
ZYGOTE64_PID=$(pidof zygote64 || true)

for Z_PID in $ZYGOTE_PID $ZYGOTE64_PID; do
  nsenter --mount=/proc/$Z_PID/ns/mnt -- \
    /bin/mount --rbind /system/etc/security/cacerts /apex/com.android.conscrypt/cacerts
done
```

### 3. Set the Proxy and Run
Set your global proxy to point to your machine (usually `10.0.2.2` for the emulator) and start `mitmproxy`:

```bash
adb shell settings put global http_proxy 10.0.2.2:8080
mitmweb --listen-port 8080 --mode regular
```

Finally, launch the unpinner with Frida:

```bash
frida -U -f com.facebook.katana -l fb-native-unpinner.js
```

Once you see `[+] Hooked verifyWithMetrics`, you're good to go. Traffic should start flowing into your proxy.
