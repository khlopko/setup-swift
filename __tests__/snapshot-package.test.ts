import { OS } from "../src/os";
import { SnapshotPackageResolver } from "../src/snapshot-package";

describe("build snapshot package info", () => {
  const githubToken = process.env.TEST_GITHUB_TOKEN;
  if (githubToken) {
    const getSnapshot = new SnapshotPackageResolver(githubToken);
    const expectedDate = new Date().toISOString().split("T")[0];

    it("resolve main branch latest snapshot", async () => {
      const toolchain = await getSnapshot.getSnapshot("main-snapshot");

      expect(toolchain).toEqual({ branch: "main", date: expectedDate });
    });

    it("resolve simver branch snapshot", async () => {
      const toolchain = await getSnapshot.getSnapshot("6.0-snapshot");

      expect(toolchain).toEqual({ branch: "6.0", date: expectedDate });
    });
  }

  const resolver = new SnapshotPackageResolver(null);

  it("resolve with explicit date to main", async () => {
    const toolchain = await resolver.getSnapshot("main-snapshot-2022-01-28");

    expect(toolchain).toEqual({ branch: "main", date: "2022-01-28" });
  });

  it("resolve with explicit date to semver", async () => {
    const toolchain = await resolver.getSnapshot("5.7-snapshot-2022-08-30");

    expect(toolchain).toEqual({ branch: "5.7", date: "2022-08-30" });
  });

  it("main branch for macOS", () => {
    const pkg = resolver.getPackage(
      { branch: "main", date: "2024-08-01" },
      { os: OS.MacOS, version: "latest", name: "macOS" }
    );

    expect(pkg).toStrictEqual({
      url: "https://swift.org/builds/development/xcode/swift-DEVELOPMENT-SNAPSHOT-2024-08-01-a/swift-DEVELOPMENT-SNAPSHOT-2024-08-01-a-osx.pkg",
      name: "swift-DEVELOPMENT-SNAPSHOT-2024-08-01-a",
      version: "6.0",
      isStableRelease: false,
    });
  });

  it("main branch for Ubuntu", () => {
    const pkg = resolver.getPackage(
      { branch: "main", date: "2024-08-01" },
      { os: OS.Ubuntu, version: "22.04", name: "Ubuntu" }
    );

    expect(pkg).toStrictEqual({
      url: "https://swift.org/builds/development/ubuntu2204/swift-DEVELOPMENT-SNAPSHOT-2024-08-01-a/swift-DEVELOPMENT-SNAPSHOT-2024-08-01-a-ubuntu22.04.tar.gz",
      name: "swift-DEVELOPMENT-SNAPSHOT-2024-08-01-a",
      version: "6.0",
      isStableRelease: false,
    });
  });

  it("simver branch for macOS", () => {
    const pkg = resolver.getPackage(
      { branch: "5.10", date: "2024-08-02" },
      { os: OS.MacOS, version: "latest", name: "macOS" }
    );

    expect(pkg).toStrictEqual({
      url: "https://swift.org/builds/swift-5.10-branch/xcode/swift-5.10-DEVELOPMENT-SNAPSHOT-2024-08-02-a/swift-5.10-DEVELOPMENT-SNAPSHOT-2024-08-02-a-osx.pkg",
      name: "swift-5.10-DEVELOPMENT-SNAPSHOT-2024-08-02-a",
      version: "5.10",
      isStableRelease: false,
    });
  });

  it("simver branch for Ubuntu", () => {
    const pkg = resolver.getPackage(
      { branch: "5.10", date: "2024-08-02" },
      { os: OS.Ubuntu, version: "22.04", name: "Ubuntu" }
    );

    expect(pkg).toStrictEqual({
      url: "https://swift.org/builds/swift-5.10-branch/ubuntu2204/swift-5.10-DEVELOPMENT-SNAPSHOT-2024-08-02-a/swift-5.10-DEVELOPMENT-SNAPSHOT-2024-08-02-a-ubuntu22.04.tar.gz",
      name: "swift-5.10-DEVELOPMENT-SNAPSHOT-2024-08-02-a",
      version: "5.10",
      isStableRelease: false,
    });
  });
});
