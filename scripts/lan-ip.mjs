import { networkInterfaces } from "node:os";

/** This PC's address on the home network, which a phone on the same Wi-Fi can reach. */
export const lanIp = () =>
  Object.values(networkInterfaces())
    .flat()
    .find((a) => a?.family === "IPv4" && !a.internal && a.address.startsWith("192.168."))?.address;
