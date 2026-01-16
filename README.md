# Slidev Course Manager

A Visual Studio Code extension for managing educational courses composed of Slidev presentations.

## Features

- **Course Explorer**: Visual tree view of your course structure
- **Lecture Management**: Create, edit, and organize Slidev lectures
- **Build System**: Build individual lectures or entire courses
- **Development Server**: Start development servers for live editing
- **Filesystem-based**: No proprietary metadata, works with existing Slidev projects

## Getting Started

### Prerequisites

- Visual Studio Code 1.74.0 or higher
- Node.js 16.x or higher
- pnpm package manager (recommended)

### Installation

1. Clone or download this repository
2. Run `pnpm install` to install dependencies
3. Press `F5` in VS Code to start debugging the extension
4. Or run `pnpm run package` to create a VSIX file for installation

**Note**: If you don't have pnpm installed, install it with:
```bash
npm install -g pnpm
```

### Project Structure

The extension expects the following project structure:

```
project-root/
├─ slides/
│  ├─ lecture-1/
│  │  ├─ slides.md
│  │  ├─ package.json
│  │  └─ ...
│  └─ lecture-2/
│     └─ ...
├─ course-name/
│  ├─ slides.json
│  ├─ index.html
│  └─ assets/
└─ package.json
```

## Usage

### Course Explorer

Open the Course Explorer view from the Explorer sidebar. You'll see:

- **Course Node**: Root node representing your course
- **Lectures Group**: Container for all lectures
- **Lecture Nodes**: Individual lectures with build status

### Commands

All commands are available through:
- Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
- Right-click context menus in Course Explorer
- View title buttons

#### Available Commands

- **Create New Lecture**: Creates a new lecture with basic setup
- **Open Lecture Source**: Opens the `slides.md` file for editing
- **Start Development Server**: Starts Slidev dev server for live editing
- **Build Lecture**: Builds a single lecture to static files
- **Build Course**: Builds all lectures and generates course index
- **View Course**: Opens the built course in your default browser
- **Refresh**: Refreshes the Course Explorer view

### Lecture Structure

Each lecture must contain:

- **`slides.md`**: Main presentation file with YAML frontmatter
- **`package.json`**: Node.js project configuration

#### Frontmatter Format

```yaml
---
title: "Lecture Title"          # Required
description: "Short summary"    # Optional
date: "2026-01-15"             # Optional (YYYY-MM-DD)
---
```

### Building Courses

1. **Individual Lecture**: Right-click a lecture node → "Build Lecture"
2. **Entire Course**: Right-click course node → "Build Course"

The build process:
- Compiles each lecture to static files
- Generates `slides.json` with course structure
- Creates a complete course website in the output directory

## Development

### Building and Testing

```bash
# Install dependencies
pnpm install

# Compile TypeScript
pnpm run compile

# Watch for changes
pnpm run watch

# Run tests
pnpm test

# Lint code
pnpm run lint

# Package extension
pnpm run package

# Publish extension
pnpm run publish
```

### Project Structure

```
src/
├── extension.ts              # Main extension entry point
├── types/
│   └── index.ts             # TypeScript interfaces and types
├── providers/
│   └── CourseExplorerProvider.ts  # Tree view data provider
└── managers/
    └── SlidevCourseManager.ts     # Core business logic
```

## Architecture

### Core Principles

- **Filesystem-based**: All state derived from project files
- **Stateless**: No persistent storage, rebuilds from sources
- **Deterministic**: Same input always produces same output
- **Recoverable**: Extension can be removed without breaking projects

### Key Components

- **CourseExplorerProvider**: Implements VS Code TreeDataProvider
- **SlidevCourseManager**: Handles filesystem operations and Slidev integration
- **Lecture Discovery**: Scans `slides/` directory for lecture directories
- **Build System**: Integrates with Slidev CLI for compilation

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation as needed
4. Ensure all commands work from both UI and Command Palette

## License

MIT License - see LICENSE file for details

## Requirements

- VS Code 1.74.0+
- Node.js 16.x+
- Slidev 0.47.0+
