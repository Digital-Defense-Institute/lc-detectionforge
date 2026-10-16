# Contributing to DetectionForge

Thank you for your interest in contributing to DetectionForge! This guide will help you understand our development workflow, particularly around version management and releases.

## 🚀 Quick Start for Contributors

1. **Fork the repository** and create a feature branch from `main`
2. **Focus on your implementation** - don't worry about versioning
3. **Submit a pull request** with a clear description
4. **Maintainers handle** version bumps and release coordination

## 🔄 Development Workflow

### For Contributors

**What You Should Do:**
- Implement your feature or fix
- Write clear commit messages
- Add tests if applicable
- Update relevant documentation
- Submit PR with thorough description

**What You Should NOT Do:**
- ❌ Update `package.json` version numbers
- ❌ Edit `src/utils/version.ts` changelog
- ❌ Create version tags or releases
- ❌ Worry about coordinating with other PRs

### For Maintainers

**Release Preparation Process:**

1. **Create Release Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b release/v1.X.0
   ```

2. **Aggregate Selected PRs**
   ```bash
   # Option A: Cherry-pick commits from merged PRs
   git cherry-pick <commit-hash-1>
   git cherry-pick <commit-hash-2>
   
   # Option B: Merge feature branches
   git merge feature/contributor-branch-1
   git merge feature/contributor-branch-2
   ```

3. **Update Version and Changelog**
   ```bash
   # Update src/utils/version.ts with aggregated changes
   # Then bump version
   npm run version:minor  # or patch/major
   ```

4. **Create Release PR**
   ```bash
   git push -u origin release/v1.X.0
   gh pr create --title "Release v1.X.0: [Summary]" --body "[Details]"
   ```

5. **After CI/CD Validation and Merge**
   ```bash
   git checkout main
   git pull origin main
   git tag v1.X.0
   git push origin v1.X.0
   ```

## 📝 Pull Request Guidelines

### PR Requirements

- [ ] **Clear title** describing the change
- [ ] **Detailed description** of what changed and why
- [ ] **Type of change** labeled (bug fix, feature, docs, etc.)
- [ ] **Testing performed** (if applicable)
- [ ] **Screenshots** for UI changes (if applicable)

### PR Template

Use this template for your pull requests:

```markdown
## Summary
Brief description of changes made

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that causes existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🧹 Code cleanup/refactoring
- [ ] 🎨 UI/UX improvement

## Changes Made
- Specific change 1
- Specific change 2
- Specific change 3

## Testing Performed
- [ ] Manual testing completed
- [ ] Existing functionality verified
- [ ] New functionality tested
- [ ] Cross-browser testing (if UI changes)

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Notes
<!-- Any additional context, concerns, or considerations -->
```

## 🏷️ Version Management

### Version Scheme

DetectionForge follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes that affect existing functionality
- **MINOR** (1.X.0): New features that are backward compatible
- **PATCH** (1.1.X): Bug fixes and small improvements

### Changelog Format

Releases follow [Keep a Changelog](https://keepachangelog.com/) format:

- **Added**: New features and capabilities
- **Changed**: Changes to existing functionality
- **Fixed**: Bug fixes and corrections
- **Removed**: Removed features or functionality
- **Security**: Security-related improvements

### Release Aggregation Strategy

Maintainers may group multiple PRs into a single release to:

- **Coordinate related features** that work better together
- **Batch multiple small fixes** into a single patch release
- **Ensure comprehensive testing** of combined changes
- **Provide cohesive release notes** that tell a complete story

## 🛠️ Development Setup

### Prerequisites

- **Node.js**: Version 18 or higher
- **Git**: For version control
- **GitHub CLI** (optional): For easier PR management

### Local Development

```bash
# Fork and clone the repository
git clone https://github.com/YOUR-USERNAME/lc-detectionforge.git
cd lc-detectionforge

# Add upstream remote
git remote add upstream https://github.com/Digital-Defense-Institute/lc-detectionforge.git

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Development Commands

```bash
# Development server with hot reload
npm run dev

# Type checking
npm run type-check

# Unit tests
npm test

# Linting and auto-fix
npm run lint

# Code formatting
npm run format

# Production build
npm run build

# Preview production build
npm run preview
```

### Code Quality

We use several tools to maintain code quality:

- **TypeScript**: Type safety and better development experience
- **ESLint**: Code linting with Vue and TypeScript support
- **Prettier**: Consistent code formatting
- **Vue TSC**: Type checking for Vue components

### Recommended IDE Setup

- **VS Code** with extensions:
  - Volar (Vue Language Features)
  - TypeScript Vue Plugin
  - ESLint
  - Prettier
  - EditorConfig

## 🔍 Testing Guidelines

### Manual Testing

For UI changes:
- [ ] Test in Chrome, Firefox, Safari
- [ ] Verify responsive design
- [ ] Check dark/light mode compatibility
- [ ] Test with different data scenarios

For functionality changes:
- [ ] Test happy path scenarios
- [ ] Test edge cases and error conditions
- [ ] Verify existing functionality still works
- [ ] Test with different LimaCharlie configurations

### Automated Testing

DetectionForge uses Vitest for fast, isolated unit tests. Run the full suite with
`npm test`; tests live alongside their unit under `src/**/__tests__/` or in
`src/__tests__/` for cross-cutting utilities.

When changing a utility or business-rule module:

- Add or update focused tests for the public behavior, including an important
  failure or boundary case.
- Keep unit tests deterministic: mock browser APIs and network boundaries rather
  than calling LimaCharlie services.
- Run `npm test` and `npm run type-check` before opening a pull request.

Component and end-to-end coverage can be added where it provides more value than
unit coverage, but core rule parsing, validation, suppression, and export logic
should remain covered by unit tests.

## 🚨 Security Considerations

### Sensitive Data

DetectionForge handles sensitive LimaCharlie credentials:

- **Never commit** API keys, tokens, or credentials
- **Use placeholder data** in examples and documentation
- **Memory-only storage** for credentials in the application
- **Report security issues** privately to maintainers

### Code Security

- Sanitize all user inputs
- Use DOMPurify for HTML content
- Validate API responses
- Follow secure coding practices

## 🌟 Recognition

Contributors are recognized in several ways:

- **Git commit history** preserves authorship
- **Release notes** may highlight significant contributions
- **GitHub contributors** page shows all contributors
- **Community recognition** for exceptional contributions

## 📞 Getting Help

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas
- **Documentation**: Check existing docs first
- **Code Comments**: Look for inline documentation

## 🎯 Contribution Ideas

Looking for ways to contribute? Consider:

### 🐛 Bug Fixes
- Check open issues labeled "bug"
- Test edge cases and report issues
- Fix UI/UX inconsistencies

### ✨ Features
- Implement items from the roadmap
- Add new event type templates
- Improve autocompletion suggestions
- Enhance export/import capabilities

### 📚 Documentation
- Improve setup instructions
- Add usage examples
- Create video tutorials
- Update API documentation

### 🎨 UI/UX
- Improve accessibility
- Enhance responsive design
- Add keyboard shortcuts
- Optimize user workflows

### 🔧 Technical Improvements
- Performance optimizations
- Code organization improvements
- Build process enhancements
- Security improvements

---

**Every contribution matters!** Whether you're fixing a typo, implementing a major feature, or improving documentation, we appreciate your efforts to make DetectionForge better for the security community.
