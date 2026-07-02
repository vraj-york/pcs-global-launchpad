# How to Check if Husky is Working

## Quick Checks

### 1. Verify Husky Installation
```bash
# Check if husky is installed
npm list husky

# Check if hooks directory exists and hooks are executable
ls -la .husky/
```

### 2. Verify Git Hooks Configuration
```bash
# Check if git is configured to use husky hooks
git config core.hooksPath

# Should output: .husky (or the path to your .husky directory)
```

### 3. Check if Hooks are Installed in Git
```bash
# Check if git hooks are symlinked/installed
ls -la .git/hooks/ | grep -E "(pre-commit|pre-push|commit-msg)"
```

## Testing Each Hook

### Test Pre-commit Hook
The `pre-commit` hook runs `npm run lint` and `npm run format:check`.

**Method 1: Manual execution**
```bash
# Run the hook manually
.husky/pre-commit
```

**Method 2: Trigger via commit (recommended)**
```bash
# Make a small change
echo "// test" >> src/app.service.ts

# Stage the change
git add src/app.service.ts

# Try to commit - this will trigger the pre-commit hook
git commit -m "test: check husky pre-commit hook"

# If husky is working:
# - It will run linting
# - It will check formatting
# - If either fails, the commit will be blocked
```

### Test Pre-push Hook
The `pre-push` hook runs `npm run test`.

**Method 1: Manual execution**
```bash
# Run the hook manually
.husky/pre-push
```

**Method 2: Trigger via push**
```bash
# Make a commit (if you have changes)
git commit -m "test commit"

# Try to push - this will trigger the pre-push hook
git push

# If husky is working:
# - It will run tests
# - If tests fail, the push will be blocked
```

### Test Commit-msg Hook
The `commit-msg` hook runs Gerrit's commit-msg hook if it exists.

**Method 1: Manual execution**
```bash
# Run the hook manually with a test commit message
echo "test commit message" | .husky/commit-msg
```

**Method 2: Trigger via commit**
```bash
# Try to commit with a message
git commit -m "test: check commit-msg hook"

# The hook will process the commit message
```

## Troubleshooting

### If Hooks Don't Run

1. **Reinstall Husky hooks:**
   ```bash
   npm run prepare
   # or
   npx husky install
   ```

2. **Check git hooks path:**
   ```bash
   git config core.hooksPath
   # If empty or wrong, set it:
   git config core.hooksPath .husky
   ```

3. **Make hooks executable:**
   ```bash
   chmod +x .husky/pre-commit
   chmod +x .husky/pre-push
   chmod +x .husky/commit-msg
   ```

4. **Verify husky is in package.json:**
   ```bash
   # Should show husky in devDependencies
   cat package.json | grep husky
   ```

### Expected Behavior

- ✅ **Pre-commit**: Should run linting and format checks before allowing commit
- ✅ **Pre-push**: Should run tests before allowing push
- ✅ **Commit-msg**: Should process commit messages (if Gerrit hook exists)

### Quick Test Script

You can create a simple test:
```bash
# Test all hooks manually
echo "Testing pre-commit hook..."
.husky/pre-commit && echo "✅ Pre-commit hook works" || echo "❌ Pre-commit hook failed"

echo "Testing pre-push hook..."
.husky/pre-push && echo "✅ Pre-push hook works" || echo "❌ Pre-push hook failed"
```

