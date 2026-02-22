# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Project Eras

### 2019 (Hackathon Era)
Initial kuskus project created at hackathon (July 25, 2019). Featured basic Kusto grammar support and language server foundation with core LSP functionality for syntax highlighting and basic language features.

### 2019-2023 (Foundation Era)
Steady maintenance period with consistent dependency updates, security patches, and community bugfixes. Regular release cycles focused on stability and compatibility with VSCode updates. Maintained core language server functionality with incremental improvements to syntax highlighting and grammar definitions. Versions 1.0.1 through 1.0.40 represent the stable foundation of the project.

### April 2024 (Modernization Era)
Major modernization initiative launched. Upgraded from v1.0.40 → v3.0.0+ with significant tooling and dependency improvements. Migrated from tslint to ESLint, updated VSCode API from 1.33 → 1.85, and upgraded @kusto/language-service-next from v11.5.3 → v12.3.2. Improved code quality, test coverage, and development workflow efficiency.

---

## [Unreleased] - v3.5.0

**Status**: Ready for release - Currently in development

### Added
- New `take_any()` aggregate function support (#101)
- Support escape sequences `\t` and `\n` in syntax highlighting
- Document symbols (Outline view) for `let` bindings — functions and variables now appear in the VS Code Outline panel and workspace symbol search (#105)

### Changed
- **Modernized Build Tooling**
  - Migrated from tslint → ESLint with airbnb-base ruleset (#132, #134, #147)
  - Reduced ESLint errors from 88 → 0 through systematic fixes
  - Modernized linting configuration and CI/CD integration
  - Migrated publish workflows from vendored `gh-action-bump-version-master` → upstream `phips28/gh-action-bump-version@v11` (#65)
  - Removed vendored `jq-action-master` (no longer referenced) (#66)

- **Major Dependency Upgrades**
  - @kusto/language-service-next: v11.5.3 → v12.3.2 (#127) - Major feature additions and improvements
  - VSCode API: 1.33 → 1.85 (#130, #133) - 52 version releases of improvements
  - TypeScript: Latest stable version with enhanced type safety
  - vscode-languageclient & vscode-languageserver: Updated to latest stable
  - Updated @types/vscode, @types/node, @types/lodash
  - clipboardy: 3.0.0 → 2.3.0 (reverted for stability, #225)

- **Code Quality Improvements**
  - Fixed ESLint compliance across entire codebase
  - Enhanced null-safety checks for symbol properties in hover functionality
  - Improved error handling in symbol loading

### Fixed
- **#94**: Handle escaped backslashes in syntax highlighting for proper string parsing
- **#104**: Add null-safety checks for symbol properties in hover to prevent crashes
- **#218**: Fixed symbol loading bug by pinning clipboardy to 2.3.0 (#225)
- **#208**: Color theme scoping to prevent conflicts with other file types
- Symbol loading array indexing for cluster symbols
- Multiple ESLint compliance issues across kustoSymbols.ts and related files
- Improved error messages for failed authentications (#156)

### Removed
- **Custom Function Injection**: Mechanism removed as @kusto/language-service-next v12.3.2 now provides native support
- Obsolete tslint configuration and dependencies

### Security
- Fixed 12 npm vulnerabilities through targeted dependency updates
- Reduced vulnerability severity from 1 CRITICAL → 0
- Implemented security-focused dependency audit processes
- Updated all production and development dependencies to latest secure versions
- Enhanced authentication error handling

---

## [3.4.2] - 2024-12-27

### Changed
- build(deps): Bump @kusto/language-service-next (#204)
- build(deps): Bump npm_and_yarn group in /kusto-language-server/client with 2 updates (#207)

### Fixed
- Symbol loading improvements from @kusto/language-service-next updates

---

## [3.4.1] - 2024-08-21

### Changed
- build(deps): Bump braces (#190)
- build(deps): Bump npm_and_yarn group (#191)

---

## [3.4.0] - 2024-08-18

### Changed
- build(deps): Bump production-dependencies group (#184)
- Updated core dependencies for improved stability

---

## [3.3.1] - 2024-08-01

### Changed
- Maintenance release with dependency updates

---

## [3.3.0] - 2024-08-01

### Changed
- build(deps-dev): Bump TypeScript and enhanced type checking (#188, #189)
- build(deps-dev): Bump dev-dependencies group with multiple updates (#183, #186)

---

## [3.2.4] - 2024-07-03

### Changed
- build(deps-dev): Bump dev-dependencies group with multiple updates (#181, #182)

---

## [3.2.3] - 2024-06-20

### Changed
- build(deps): Bump npm_and_yarn group (#177)
- build(deps-dev): Bump braces (#178)

---

## [3.2.2] - 2024-06-02

### Changed
- build(deps-dev): Bump dev-dependencies group (#172, #173)
- build(deps-dev): Bump @types/node (#174)

### Other
- Reduced dependabot frequency from weekly to monthly for more stable releases

---

## [3.1.5] - 2024-05-26

### Changed
- build(deps-dev): Bump @typescript-eslint/eslint-plugin for improved linting (#168, #169)

---

## [3.1.4] - 2024-05-24

### Changed
- build(deps-dev): Bump @types/node (#163)
- build(deps-dev): Bump @typescript-eslint/eslint-plugin (#164)
- build(deps-dev): Bump dev-dependencies group (#165)

---

## [3.1.3] - 2024-05-12

### Changed
- build(deps-dev): Bump @types/node (#160)
- build(deps): Bump @kusto/language-service-next for new features (#161)

### Fixed
- Fix escaped backslash at end of string for proper string parsing (#162)

---

## [3.1.2] - 2024-05-05

### Changed
- build(deps-dev): Bump @types/node (#158)
- build(deps-dev): Bump @types/vscode (#157)

---

## [3.1.1] - 2024-04-30

### Changed
- build(deps-dev): Bump @typescript-eslint/eslint-plugin (#154, #155)

---

## [3.1.0] - 2024-04-30

### Added
- Activate extension on command `kuskus.loadSymbols` (#150)

### Changed
- Improved command-based activation logic

---

## [3.0.0] - 2024-04-29

### Added
- Extension activation on kuskus.loadSymbols command (#150)

### Changed
- Major version bump reflecting significant internal modernization
- Update vscode-languageclient and vscode-languageserver to latest stable versions (#148)
- Update clipboardy to improved version (#148)
- Update vscode-tmgrammar-test to 0.1.3 (#153)

### Fixed
- Fix .vscodeignore for proper client packaging (#152)
- Improve authentication error messages (#156)

---

## [2.0.5] - 2024-04-28
- Maintenance release with build updates

## [2.0.4] - 2024-04-29
- Build and dependency maintenance

## [2.0.3] - 2024-04-29
- Continued modernization preparations

## [2.0.2] - 2024-04-28
- Build infrastructure updates

## [2.0.1] - 2024-04-27
- Preparation for v3.0 release

## [2.0.0] - 2024-04-27

### Changed
- Major version bump as part of modernization initiative
- Updated @kusto/language-service-next to v11.5.3 (#127)
- Transitioned build tooling and updated VSCode API compatibility (#130-#147)
- Created dependabot.yml for automated dependency management
- Removed unnecessary dependencies from root package.json (#146)

### Added
- ESLint configuration and tooling updates (#147)

---

## Foundation Era (v1.x, 2019-2024)

### [1.0.40] through [1.0.1]

Extended maintenance period spanning from December 2021 through March 2024. Versions 1.0.1 through 1.0.40 represent the stable, long-term support line of the Kusto Language Server, providing reliable and consistent:

- Kusto grammar support and syntax highlighting
- Language server protocol implementation
- VSCode integration and extension functionality
- Regular security updates and dependency patches
- Incremental improvements to language features

**Key Highlights:**
- Consistent quarterly security updates addressing vulnerabilities
- Support for VSCode API evolution and compatibility
- Progressive improvements to syntax highlighting grammar
- Support for emerging Kusto language features and functions
- Stable and predictable release cycles

For detailed information about changes in the v1.x release series, refer to the git commit history at https://github.com/rosshamish/kuskus

---

## Versioning Notes

- **Semantic Versioning**: This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) starting from v2.0.0
- **Keep a Changelog**: Format based on [keepachangelog.com](https://keepachangelog.com/en/1.0.0/)
- **Release Schedule**: Releases are published as needed for features, fixes, and security updates
- **Git Repository**: [rosshamish/kuskus](https://github.com/rosshamish/kuskus)
