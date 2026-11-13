import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.kinast.evenly",
  appName: "Evenly",
  webDir: "dist",
  plugins: {
    FirebaseAuthentication: { skipNativeAuth: false, providers: [] },
  },
};

export default config;
