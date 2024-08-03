import * as os from "os";
import * as path from "path";
import * as core from "@actions/core";
import * as toolCache from "@actions/tool-cache";
import * as fs from "fs";
import { System } from "./os";
import { Package } from "./swift-versions";
import { setupKeys, verify } from "./gpg";

export async function install(
  version: string,
  system: System,
  getPackage: () => Promise<Package>
) {
  if (os.platform() !== "linux") {
    core.error("Trying to run linux installer on non-linux os");
    return;
  }

  let swiftPath = toolCache.find(`swift-${system.name}`, version);

  if (swiftPath === null || swiftPath.trim().length == 0) {
    core.debug(`No matching installation found`);

    await setupKeys();

    const swiftPkg = await getPackage();
    let { pkg, signature } = await download(swiftPkg);

    await verify(signature, pkg);

    swiftPath = await unpack(swiftPkg, pkg, version, system);
  } else {
    core.debug("Matching installation found");
  }

  core.debug("Adding swift to path");

  let binPath = path.join(swiftPath, "/usr/bin");
  core.debug(`Swift binary path (exists=${fs.existsSync(binPath)}: ${binPath}`);

  core.addPath(binPath);

  core.debug("Swift installed");
}

async function download({ url, name }: Package) {
  core.debug("Downloading swift for linux");

  let [pkg, signature] = await Promise.all([
    toolCache.downloadTool(url),
    toolCache.downloadTool(`${url}.sig`),
  ]);

  core.debug("Swift download complete");
  return { pkg, signature, name };
}

async function unpack(
  { name, isStableRelease }: Package,
  packagePath: string,
  version: string,
  system: System
) {
  core.debug("Extracting package");
  let extractPath = await toolCache.extractTar(packagePath);
  if (isStableRelease) {
    extractPath = path.join(extractPath, name);
  } else {
    extractPath = path.join(extractPath, `${name}-ubuntu${system.version}`);
  }
  core.debug("Package extracted");
  let cachedPath = await toolCache.cacheDir(
    path.join(extractPath),
    `swift-${system.name}`,
    version
  );
  core.debug("Package cached");
  return cachedPath;
}
