# Contributing to Debug Pi

Thank you for your interest in contributing to Debug Pi! This guide will help you get started.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the project and community

## Getting Started

### Prerequisites

- Bun 1.2+
- Git
- Basic knowledge of TypeScript and React
- (Optional) Raspberry Pi hardware for testing

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/debuggingpi.git
   cd debuggingpi
   ```

3. Install dependencies:
   ```bash
   bun install
   ```

4. Run checks:
   ```bash
   ./scripts/dev-setup.sh
   ```

## Development Workflow

### Project Structure

```
debuggingpi/
├── apps/              # Applications
│   ├── debug-pi-server/   # Web server
│   ├── debug-pi-daemon/   # System daemon
│   └── debug-pi-web/      # React UI
├── packages/          # Shared packages
├── systemd/          # Service configs
├── tools/            # Build tools
└── docs/             # Documentation
```

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Run checks locally:
   ```bash
   bun run typecheck
   bun run lint
   bun run build
   ```

4. Commit with descriptive messages:
   ```bash
   git commit -m "feat: add new feature"
   ```

5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Open a Pull Request

## Coding Standards

### TypeScript

- Follow the TypeScript instructions in `.github/instructions/typescript.instructions.md`
- Use Effect TS for async operations
- Never use `any` - use `unknown` with type guards
- Explicitly type all function returns
- Prefer `type` over `interface`
- Use `const` assertions for literals

### React

- Use functional components with hooks
- Prefer declarative over imperative code
- Use `const` arrow functions
- Keep components focused and small
- Extract reusable logic into custom hooks

### Naming

- Use `kebab-case` for files and directories
- Use `PascalCase` for React components
- Use `camelCase` for variables and functions
- Use `UPPER_CASE` for constants

### Formatting

We use Biome for formatting:
```bash
bun run format
```

## Testing

Currently, the project focuses on manual testing on actual hardware. Contributions to add automated tests are welcome!

### Manual Testing Checklist

- [ ] Build succeeds without errors
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Changes work on actual Pi hardware
- [ ] No regressions in existing features
- [ ] Documentation updated if needed

## Pull Request Process

1. **Description**: Clearly describe what changes you've made and why
2. **Testing**: Explain how you tested your changes
3. **Documentation**: Update docs if you changed functionality
4. **Commits**: Keep commits atomic and well-described
5. **Review**: Respond to feedback promptly

### PR Title Convention

Use conventional commits format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Build/tooling changes

Examples:
- `feat: add support for Pi 4 hardware`
- `fix: resolve USB tether detection issue`
- `docs: update quick start guide`

## Areas for Contribution

### High Priority

- **Testing**: Add unit and integration tests
- **Hardware Support**: Test and document additional Pi models
- **Performance**: Optimize log streaming and status polling
- **Security**: Security audit and improvements

### Medium Priority

- **Features**: Additional configuration options
- **UI**: Improve mobile responsiveness
- **Documentation**: More examples and tutorials
- **Localization**: Multi-language support

### Good First Issues

Look for issues tagged with `good-first-issue`:
- Documentation improvements
- UI/UX enhancements
- Bug fixes
- Code cleanup

## Documentation

When adding features, update:
- **README.md**: If it affects setup or overview
- **docs/quick-start.md**: If it affects getting started
- **docs/operations.md**: If it affects operations
- **docs/architecture.md**: If it affects architecture
- Code comments: For complex logic

## Issue Guidelines

### Reporting Bugs

Include:
- **Description**: Clear description of the bug
- **Steps to Reproduce**: Step-by-step instructions
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: Pi model, OS version, Debug Pi version
- **Logs**: Relevant log snippets

### Feature Requests

Include:
- **Use Case**: Why is this needed?
- **Description**: What should it do?
- **Alternatives**: Other solutions you considered
- **Implementation Ideas**: Rough technical approach

## Development Tips

### Testing Without Hardware

Most UI/API work can be tested locally:
```bash
./scripts/run-dev.sh
```

This starts the server, but system features (networking, logs) won't work without actual Pi hardware.

### Testing with Hardware

1. Build a test image with your changes
2. Flash to SD card
3. Boot the Pi
4. Test your changes
5. Check logs for errors:
   ```bash
   ssh pi@192.168.1.1
   sudo journalctl -u debug-pi-server
   sudo journalctl -u debug-pi-daemon
   ```

### Debugging

- **Server logs**: `journalctl -u debug-pi-server -f`
- **Daemon logs**: `journalctl -u debug-pi-daemon -f`
- **Browser console**: Check for JS errors (F12)
- **Network tab**: Check API requests/responses

## Questions?

- Open an issue for questions
- Check existing issues and PRs
- Review documentation in `docs/`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🙏
