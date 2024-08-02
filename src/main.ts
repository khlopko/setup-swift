import { EOL } from "os";
import * as core from "@actions/core";
import * as system from "./os";
import * as versions from "./swift-versions";
import * as macos from "./macos-install";
import * as linux from "./linux-install";
import * as windows from "./windows-install";
import { getVersion } from "./get-version";
import { System } from "./os";
import { SnapshotPackageResolver } from "./snapshot-package";

async function run() {
  try {
    const requestedVersion = core.getInput("swift-version", { required: true });
    let platform = await system.getSystem();
    try {
      let version = versions.verify(requestedVersion, platform);
      await install(version, platform, async () =>
        versions.swiftPackage(version, platform)
      );
    } catch {
      const resolver = new SnapshotPackageResolver(null);
      const pkg = await resolver.execute(requestedVersion, platform);
      if (!pkg) {
        throw new Error(
          `Couldn't form a package for requested version ${requestedVersion} on ${platform}`
        );
      }
      await install(pkg.version, platform, async () => pkg);
    }
  } catch (error) {
    let dump: String;
    if (error instanceof Error) {
      dump = `${error.message}${EOL}Stacktrace:${EOL}${error.stack}`;
    } else {
      dump = `${error}`;
    }

    core.setFailed(
      `Unexpected error, unable to continue. Please report at https://github.com/swift-actions/setup-swift/issues${EOL}${dump}`
    );
  }
}

async function install(
  version: string,
  platform: System,
  getPackage: () => Promise<versions.Package>
) {
  switch (platform.os) {
    case system.OS.MacOS:
      await macos.install(version, getPackage);
      break;
    case system.OS.Ubuntu:
      await linux.install(version, platform, getPackage);
      break;
    case system.OS.Windows:
      await windows.install(version, platform);
  }
  const current = await getVersion();
  if (current === version) {
    core.setOutput("version", version);
  } else {
    core.error(
      `Failed to setup requested swift version. requestd: ${version}, actual: ${current}`
    );
  }
}

run();
