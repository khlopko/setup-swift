import { OS, System } from "./os";
import { Package } from "./swift-versions";

export type Tag = {
  name: string;
};

export type Snapshot = {
  branch: string;
  date: string;
};

export class SnapshotPackageResolver {
  private githubToken: string | null;
  private limit: number = 100;

  constructor(githubToken: string | null) {
    this.githubToken =
      githubToken || process.env.API_GITHUB_ACCESS_TOKEN || null;
  }

  async execute(version: string, platform: System): Promise<Package | null> {
    const snapshot = await this.getSnapshot(version);
    if (!snapshot) {
      return null;
    }
    const pkg = this.getPackage(snapshot, platform);
    return pkg;
  }

  async getSnapshot(version: string): Promise<Snapshot | null> {
    let index = version.indexOf("-");
    if (index === -1) {
      return null;
    }
    const branch = version.split("-")[0];
    index = version.indexOf("-", index + 1);
    if (index === -1) {
      const snapshot = await this.fetchSnapshot(branch);
      return snapshot;
    }
    const date = version.slice(index + 1, version.length);
    return { branch, date };
  }

  private async fetchSnapshot(targetBranch: string): Promise<Snapshot | null> {
    let page = 0;
    while (true) {
      const tags = await this.getTags(page);
      for (const tag of tags) {
        const snapshot = this.parseSnapshot(tag);
        if (snapshot && snapshot.branch == targetBranch) {
          return snapshot;
        }
      }
      if (tags.length < this.limit) {
        return null;
      }
      page += 1;
    }
  }

  private parseSnapshot(tag: Tag): Snapshot | null {
    const matches = tag.name.match(
      /swift(?:-(\d+)\\.(\d+))?-DEVELOPMENT-SNAPSHOT-(\d{4}-\d{2}-\d{2})/
    );
    if (!matches) {
      return null;
    }
    if (matches[1] && matches[2]) {
      const major = matches[1];
      const minor = matches[2];
      return { branch: `${major}.${minor}`, date: matches[3] };
    }
    return { branch: "main", date: matches[3] };
  }

  private async getTags(page: number): Promise<Tag[]> {
    const url = `https://api.github.com/repos/apple/swift/tags?per_page=${this.limit}&page=${page}`;
    let headers = {};
    if (this.githubToken) {
      headers = {
        Authorization: `Bearer ${this.githubToken}`,
      };
    }
    const response = await fetch(url, {
      headers: headers,
    });
    const json: any = await response.json();
    const tags: Tag[] = json.map((e: any) => {
      return { name: e.name };
    });
    return tags;
  }

  getPackage(snapshot: Snapshot, system: System): Package {
    const identifier =
      snapshot.branch === "main"
        ? `swift-DEVELOPMENT-SNAPSHOT-${snapshot.date}-a`
        : `swift-${snapshot.branch}-DEVELOPMENT-SNAPSHOT-${snapshot.date}-a`;

    let platform: string;
    let archiveFile: string;

    switch (system.os) {
      case OS.MacOS:
        platform = "xcode";
        archiveFile = `${identifier}-osx.pkg`;
        break;
      case OS.Ubuntu:
        platform = `ubuntu${system.version.replace(/\D/g, "")}`;
        archiveFile = `${identifier}-ubuntu${system.version}.tar.gz`;
        break;
      default:
        throw new Error(
          "Cannot create download URL for an unsupported platform"
        );
    }
    let url = "https://swift.org/builds/";
    if (snapshot.branch === "main") {
      url += "development/";
    } else {
      url += `swift-${snapshot.branch}-branch/`;
    }
    url += `${platform}/`;
    url += `${identifier}/`;
    url += `${archiveFile}`;

    console.log(url);
    return {
      url: url,
      name: identifier,
      // TODO: Remove hardcodede version for main!
      version: snapshot.branch === "main" ? "6.0" : snapshot.branch,
      isStableRelease: false,
    };
  }
}
