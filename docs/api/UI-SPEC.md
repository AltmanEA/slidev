# UI-SPEC.md

## User Interface Specification — Slidev Course Management Extension

**Status:** Draft
**Version:** 1.0
**Scope:** UI behavior and Tree View contract
**Depends on:** SPEC.md

---

## 1. Purpose

This document defines **mandatory UI requirements** for the extension.

It specifies:

* how the UI integrates into VS Code,
* what views exist,
* what data UI nodes MUST expose,
* how UI actions map to commands.

---

## 2. UI Architecture Constraints

The UI MUST:

* Be implemented exclusively using **standard VS Code Extension APIs**
* Be rendered in the **Activity Bar sidebar**
* Use `TreeView` / `TreeDataProvider`
* Avoid WebView for core workflows

The UI MUST NOT:

* Introduce custom rendering engines
* Store persistent UI state outside VS Code defaults

---

## 3. View Containers and Views

### 3.1 View Container

The extension SHALL register one view container in the Activity Bar.

* Container title: implementation-defined
* Icon: implementation-defined
* Scope: workspace

---

### 3.2 Primary View: Course Explorer

The container MUST host a **single primary Tree View**, referred to as the *Course Explorer*.

This view represents the logical structure of the course.

---

## 4. Tree View Contract (Formal)

This section defines **what Tree View nodes MUST expose**.

### 4.1 Node Types

The Tree View SHALL contain the following node types:

1. Course Node (root)
2. Lecture Group Node (logical grouping)
3. Lecture Node

No other node types are required.

---

### 4.2 Course Node

**Represents:** the current course

**Hierarchy**

* Root node
* Parent of all other nodes

**MUST expose**

* Course title (string)
* Course root path
* Output directory path

**MUST support actions**

* Build course
* View course
* Refresh course state

**MUST update when**

* `slides.json` is regenerated
* lecture set changes

---

### 4.3 Lecture Group Node

**Represents:** logical grouping of lectures (e.g. “Lectures”)

**Purpose**

* Structural only
* No filesystem mapping

**MUST expose**

* Static label
* Child lecture nodes

**MUST NOT**

* Represent a filesystem entity
* Have build state

---

### 4.4 Lecture Node (Core Contract)

**Represents:** a single lecture

This is the **most important UI contract**.

#### Identity

A Lecture Node MUST be uniquely defined by:

* `lectureId` (directory name)
* Absolute path to lecture directory

---

#### Display Data (MUST expose)

* Title (from frontmatter)
* Identifier (secondary text or tooltip)
* Optional date
* Build status:

  * not built
  * built
  * error

---

#### Capabilities (MUST expose)

Each Lecture Node MUST expose the following capabilities:

* Open source (`slides.md`)
* Start development server
* Build lecture

These capabilities MUST map 1:1 to registered VS Code commands.

---

#### State Derivation Rules

Lecture Node state MUST be derived from:

* Filesystem existence
* Frontmatter parsing
* Build artifacts presence

No cached or stored state is allowed.

---

### 4.5 Error Representation

If a lecture:

* is missing `slides.md`, or
* has invalid frontmatter, or
* fails to build

the Lecture Node MUST:

* still appear in the Tree View
* expose error state visually
* remain actionable (where possible)

---

## 5. Commands and UI Binding

### 5.1 Command Requirements

Each UI action MUST be backed by a command that:

* is registered in the Command Palette
* accepts explicit arguments
* does not depend on UI context

---

### 5.2 UI as a Thin Layer

The UI MUST:

* only invoke commands
* not implement business logic
* not mutate project state directly

All mutations MUST happen in core logic.

---

## 6. Refresh Semantics

The Tree View MUST refresh when:

* lecture directories change
* `slides.md` changes
* build outputs change

Refresh MAY be:

* automatic (file watchers)
* manual (Refresh command)

---

## 7. Non-Persistent UI State

The UI MUST NOT:

* write UI state to project files
* rely on saved expansion or selection state
* introduce UI-only metadata

---

## 8. Compliance

An implementation is UI-compliant if:

* All node types are present
* All required properties and actions are exposed
* All state is filesystem-derived
* UI remains functional after restart without migration


