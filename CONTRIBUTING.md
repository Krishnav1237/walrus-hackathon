# Contributing to VaultGuard

Thank you for your interest in contributing to VaultGuard! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the best outcome for the project
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 8 or higher
- Git
- Sui Wallet (for testing)
- Docker (optional, for full stack development)

### Setup Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/vault-guard.git
   cd vault-guard
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd apps/web && npm install
   cd ../api && npm install
   cd ../..
   ```

3. **Setup Environment**
   ```bash
   cp apps/web/.env.example apps/web/.env
   cp apps/api/.env.example apps/api/.env
   ```

4. **Start Development**
   ```bash
   # Option 1: Frontend only
   cd apps/web
   npm run dev

   # Option 2: Full stack
   docker-compose up -d postgres redis
   cd apps/api
   npm run db:generate
   npm run db:migrate
   cd ../..
   npm run dev
   ```

## Development Workflow

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

Example: `feature/add-search-functionality`

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions/updates
- `chore`: Build process or auxiliary tool changes

**Examples:**
```bash
feat(web): add receipt search functionality
fix(api): resolve rate limiting edge case
docs(readme): update installation instructions
refactor(seal): improve encryption error handling
```

### Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, readable code
   - Follow existing code style
   - Add/update tests as needed
   - Update documentation if needed

3. **Test Your Changes**
   ```bash
   # Build frontend
   cd apps/web
   npm run build

   # Build backend
   cd ../api
   npm run build

   # Run linter (if configured)
   npm run lint
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

5. **Push to Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill in the PR template
   - Link related issues

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Builds successfully
- [ ] No new warnings/errors

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Related Issues
Closes #123
```

## Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for type safety
- Use async/await over promises
- Prefer const over let, avoid var
- Use meaningful variable names
- Add JSDoc comments for complex functions

```typescript
// Good
const getUserReceipts = async (address: string): Promise<Receipt[]> => {
  // Implementation
};

// Avoid
var x = function(a) {
  // Implementation
};
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use TypeScript interfaces for props

```typescript
interface ReceiptCardProps {
  receipt: Receipt;
  onView: () => void;
}

export function ReceiptCard({ receipt, onView }: ReceiptCardProps) {
  // Implementation
}
```

### API Routes

- Validate all inputs
- Use proper HTTP status codes
- Handle errors gracefully
- Log errors with context

```typescript
router.post("/receipts", async (req, res) => {
  try {
    const data = createReceiptSchema.parse(req.body);
    // Implementation
    res.status(201).json({ receipt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating receipt:", error);
    res.status(500).json({ error: "Failed to create receipt" });
  }
});
```

## Testing Guidelines

### What to Test

- Critical user flows (upload, decrypt, etc.)
- API endpoints
- Error handling
- Edge cases

### Writing Tests

```typescript
// Example test structure (when tests are added)
describe('Receipt Upload', () => {
  it('should upload and encrypt receipt', async () => {
    // Test implementation
  });

  it('should handle upload failures', async () => {
    // Test implementation
  });
});
```

## Documentation

### When to Update Documentation

- Adding new features
- Changing APIs
- Fixing bugs that affect usage
- Improving existing features

### Documentation Files

- `README.md` - Overview and quick start
- `DEPLOYMENT.md` - Deployment instructions
- `API.md` - API documentation
- `SECURITY.md` - Security guidelines
- Inline code comments for complex logic

## Areas for Contribution

### High Priority

- [ ] Automated testing (unit, integration, e2e)
- [ ] CI/CD pipeline setup
- [ ] Performance optimization
- [ ] Mobile responsiveness improvements
- [ ] Accessibility improvements

### Medium Priority

- [ ] Additional encryption options
- [ ] Export/import functionality
- [ ] Advanced search and filtering
- [ ] Notification system enhancements
- [ ] Analytics dashboard

### Nice to Have

- [ ] Multi-language support
- [ ] Dark mode
- [ ] Receipt OCR improvements
- [ ] Bulk operations
- [ ] Receipt categories customization

## Reporting Bugs

### Before Reporting

1. Check existing issues
2. Verify it's reproducible
3. Test on latest version
4. Gather relevant information

### Bug Report Template

```markdown
**Describe the bug**
Clear description of the issue

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Screenshots**
If applicable

**Environment**
- OS: [e.g., macOS 14.0]
- Browser: [e.g., Chrome 120]
- Node version: [e.g., 18.0.0]
- App version: [e.g., 0.1.0]

**Additional context**
Any other relevant information
```

## Feature Requests

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Description of the problem

**Describe the solution you'd like**
Clear description of desired functionality

**Describe alternatives you've considered**
Other approaches considered

**Additional context**
Mockups, examples, or other context
```

## Security Issues

⚠️ **Do not report security vulnerabilities in public issues**

Email security concerns to: security@yourdomain.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Community

- GitHub Discussions: For questions and discussions
- GitHub Issues: For bugs and feature requests
- Discord/Slack: [If applicable]

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in the project

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to:
- Open a discussion on GitHub
- Comment on existing issues
- Reach out to maintainers

Thank you for contributing to VaultGuard! 🙏
