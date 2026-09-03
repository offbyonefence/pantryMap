/**
 * PantryMap CI pipeline.
 *
 * Containerized versions of every quality check: schema validation of the
 * food bank data files, JS syntax lint, unit tests, and the dist/ build.
 * `ci` runs everything; `build` returns the deployable site directory.
 *
 * Examples:
 *   dagger call ci
 *   dagger call build export --path=dist
 */
import { dag, Container, Directory, argument, object, func } from "@dagger.io/dagger"

const BUN_IMAGE = "oven/bun:1.3"

@object()
export class Pantrymap {
  source: Directory

  constructor(
    @argument({ defaultPath: "/", ignore: ["dist", ".git", ".dagger"] }) source: Directory,
  ) {
    this.source = source
  }

  /** Bun container with the project source mounted at /src. */
  @func()
  base(): Container {
    return dag
      .container()
      .from(BUN_IMAGE)
      .withDirectory("/src", this.source)
      .withWorkdir("/src")
  }

  /** Validate every data/foodbanks/*.json entry against the schema. */
  @func()
  async lintData(): Promise<string> {
    return this.base().withExec(["bun", "scripts/validate.mjs"]).stdout()
  }

  /** Syntax-check all site and build JavaScript. */
  @func()
  async lintJs(): Promise<string> {
    return this.base()
      .withEnvVariable("MISE_PROJECT_ROOT", "/src") // the task script cd's here
      .withExec(["bash", ".mise/tasks/lint/js"])
      .stdout()
  }

  /** Run the unit tests with bun test. */
  @func()
  async test(): Promise<string> {
    return this.base().withExec(["bun", "test", "tests/"]).stderr()
  }

  /** Build the deployable site; returns the dist/ directory. */
  @func()
  build(): Directory {
    return this.base()
      .withExec(["bun", "scripts/build.mjs"])
      .directory("/src/dist")
  }

  /** Run every check (lint, tests, build) — the single CI entry point. */
  @func()
  async ci(): Promise<string> {
    // Independent checks run concurrently; any failure fails the whole call.
    const [lintData, lintJs, test] = await Promise.all([
      this.lintData(),
      this.lintJs(),
      this.test(),
      this.build().sync(),
    ])
    return [lintData, lintJs, test, "CI checks passed."].join("\n")
  }
}
