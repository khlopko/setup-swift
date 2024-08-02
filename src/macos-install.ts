import * as core from "@actions/core";
import * as toolCache from "@actions/tool-cache";
import * as path from "path";
import * as fs from "fs";
import { Package } from "./swift-versions";
import { getVersion } from "./get-version";
import { System } from "./os";

export async function install(
  version: string,
  getPackage: () => Promise<Package>
) {
  const toolchainName = `swift ${version}`;
  const toolchain = await toolchainVersion(toolchainName);

  if (toolchain !== version) {
    let swiftPath = toolCache.find("swift-macOS", version);

    if (swiftPath === null || swiftPath.trim().length == 0) {
      core.debug(`No matching installation found`);

      const pkg = await getPackage();
      const path = await download(pkg);
      const extracted = await unpack(pkg, path, version);

      swiftPath = extracted;
    } else {
      core.debug("Matching installation found");
    }

    core.debug("Adding swift to path");

    let binPath = path.join(swiftPath, "/usr/bin");
    core.addPath(binPath);

    core.debug("Swift installed");
  }

  core.exportVariable("TOOLCHAINS", toolchainName);
}

async function toolchainVersion(requestedVersion: string) {
  return await getVersion("xcrun", [
    "--toolchain",
    requestedVersion,
    "--run",
    "swift",
    "--version",
  ]);
}

async function download({ url }: Package) {
  core.debug("Downloading swift for macOS");
  return toolCache.downloadTool(url);
}

async function unpack(
  { name, isStableRelease }: Package,
  packagePath: string,
  version: string
) {
  core.debug(`Extracting package at ${packagePath}`);
  const unpackedPath = await toolCache.extractXar(packagePath);
  let tarPath = path.join(unpackedPath, `${name}-package.pkg`, "Payload");
  let extractedPath = await toolCache.extractTar(tarPath);
  if (!isStableRelease) {
    extractedPath = path.join(extractedPath, `${name}-osx`);
  }
  const cachedPath = await toolCache.cacheDir(
    extractedPath,
    "swift-macOS",
    version
  );
  core.debug("Package cached");
  return cachedPath;
}
