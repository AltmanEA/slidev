## Core Specification — Slidev Course Management Extension

**Status:** Draft
**Version:** 1.2
**Audience:** Extension developers, maintainers, integrators
**Scope:** Filesystem, data model, behavior
**UI:** Defined separately in `UI-SPEC.md`

---

## 1. Purpose

This document defines the **core, non-UI specification** for a Visual Studio Code extension that manages educational courses composed of Slidev-based lecture presentations.

The specification is **implementation-agnostic** and **self-sufficient**.
A compliant implementation can be developed **without access to any reference implementation or source code**, relying only on this document and file templates.

All user interface requirements are defined in a separate document (`UI-SPEC.md`).

---

## 2. Core Principles

A compliant implementation SHALL:

* Operate exclusively on the filesystem
* Be stateless and deterministic
* Treat each lecture as an autonomous unit
* Treat the filesystem as the single source of truth
* Be fully recoverable from source files at any time
* Leave the project valid and usable if the extension is removed

---

## 3. Terminology

**Course**
A logical collection of lectures published as a single static website.

**Lecture**
An independent Slidev presentation represented by a directory containing source files and a local execution environment.

**Source Directory**
A directory containing all lecture source directories.

**Output Directory**
A directory containing the built static course website.

**Frontmatter**
A YAML metadata block at the beginning of a Markdown file.

---

## 4. Filesystem Contract

### 4.1 Root Structure

A compliant project MUST conform to the following logical structure:

```text
project-root/
├─ slides/
│  ├─ <lecture-id>/
│  │  ├─ slides.md
│  │  ├─ package.json
│  │  ├─ node_modules/
│  │  └─ ...
│  └─ ...
├─ <course-name>/
│  ├─ slides.json
│  ├─ index.html
│  └─ assets/
└─ package.json
```

---

### 4.2 Source Directory (`slides/`)

* Each subdirectory represents exactly one lecture
* The subdirectory name is the lecture identifier
* A lecture directory MUST contain a `slides.md` file
* No additional marker files are required

---

### 4.3 Output Directory (`<course-name>/`)

* Contains the built course website
* Contains a generated `slides.json` file
* MAY contain static assets and HTML files
* MUST be fully regenerable from the source directory

---

## 5. Lecture Definition

A lecture SHALL be considered valid if and only if:

* A directory exists under `slides/`
* A file named `slides.md` exists in that directory
* The file contains a valid frontmatter block

No other configuration files SHALL be required to identify a lecture.

---

## 6. Lecture Source File (`slides.md`)

### 6.1 Required File

Each lecture MUST contain a Markdown file named `slides.md`.

---

### 6.2 Frontmatter Specification

The file MUST begin with a YAML frontmatter block.

#### Supported Fields

* `title` (string, REQUIRED)
  Human-readable lecture title

* `description` (string, OPTIONAL)
  Short lecture summary

* `date` (string, OPTIONAL)
  Publication date in `YYYY-MM-DD` format

---

### 6.3 Source of Truth

The frontmatter block in `slides.md` is the **single authoritative source** for all lecture metadata.

No other file or configuration MAY override or supplement this information.

---

## 7. Lecture Environment

### 7.1 Per-Lecture Isolation

Each lecture directory SHALL be treated as a **self-contained Slidev project**.

Lecture environments MUST be isolated such that:

* Dependencies of one lecture do not affect another
* Different lectures MAY use different Slidev versions
* Removing a lecture directory removes its environment entirely

---

### 7.2 Slidev Installation

When a lecture is created, the implementation MUST:

* Initialize a Node.js project in the lecture directory
* Install Slidev (`sli.dev`) as a **local dependency**
* Ensure Slidev is executable within the lecture directory context

Global Slidev installations MUST NOT be assumed.

---

### 7.3 Lecture-Level Commands

Each lecture MUST expose the following logical commands, executable from its directory:

* **Development command**

  * Starts a Slidev development server
  * Uses `slides.md` as the entry point
  * Supports live reload during editing

* **Build command**

  * Produces a static build of the lecture
  * Generates output suitable for inclusion in the course website
  * Is deterministic and repeatable

The extension MUST invoke these commands in the lecture directory context.

---

## 8. Course Index File (`slides.json`)

### 8.1 Purpose

`slides.json` is a machine-readable index describing the course structure.

It is intended for consumption by the static course website.

---

### 8.2 Logical Content

The file SHALL include:

* A course title
* An ordered list of lectures

Each lecture entry SHALL include:

* Lecture identifier (matching directory name)
* Lecture title
* Optional description
* Optional publication date
* URL path within the course website

---

### 8.3 Generation Rules

* `slides.json` MUST be generated automatically
* It MUST NOT be edited manually
* It MUST be fully regenerable from the source directory
* Lecture order MUST be deterministic

---

### 8.4 Deletion Rules

If a lecture directory is removed from the source directory, its entry MUST be removed from `slides.json` upon regeneration.

---

## 9. Lecture Discovery

Lecture discovery MUST be performed dynamically by:

* Scanning the source directory
* Identifying subdirectories containing `slides.md`
* Parsing frontmatter for metadata

No persistent lecture registry SHALL exist.

---

## 10. Build Semantics

* Each lecture MAY be built independently
* Course build is an aggregation of lecture builds
* Build artifacts MAY be overwritten during rebuild
* Removing the output directory MUST NOT break future builds

---

## 11. Determinism and Idempotency

A compliant implementation MUST ensure:

* Rebuilding without source changes produces identical output
* The entire output directory can be deleted and regenerated
* No hidden, implicit, or cached state exists

The course output MUST be a pure function of lecture sources.

---

## 12. Compatibility Requirements

An implementation MUST:

* Work with projects created manually
* Infer all state from the filesystem
* Require no migration or upgrade steps

An implementation MUST NOT:

* Add proprietary metadata files
* Modify frontmatter format
* Extend `slides.json` with tool-specific fields

---

## 13. Removal and Portability

If the extension is removed:

* All lecture directories MUST remain valid Slidev projects
* The course output MUST remain usable
* No cleanup SHOULD be required

---

## 14. Compliance

An implementation is considered **compliant** if it satisfies all MUST and SHALL requirements defined in this specification.

---
