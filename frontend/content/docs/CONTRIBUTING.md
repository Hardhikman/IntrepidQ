---
title: Contributing Guide
description: Guidelines for contributing to the IntrepidQ AI project, including development workflows, code standards, and pull request processes.
---

# Contributing Guide

We welcome contributions to the IntrepidQ AI project! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your forked repository
3. Create a new branch for your feature or bug fix
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Guidelines

### Code Style

#### Python (Backend)
- Follow PEP 8 style guide
- Use type hints where possible
- Write docstrings for all functions and classes
- Keep functions focused and small
- Use meaningful variable and function names

#### TypeScript (Frontend)
- Follow TypeScript strict mode
- Use ESLint and Prettier for code formatting
- Write JSDoc comments for functions and components
- Use meaningful component and variable names
- Follow React best practices

### Testing

#### Backend Testing
```bash
cd backend/ai_service
pip install pytest pytest-asyncio httpx
pytest tests/ -v
```

#### Frontend Testing
```bash
cd frontend
npm test
npm test -- --coverage
```

### Documentation

#### Code Documentation
- Document all public APIs
- Include examples where appropriate
- Keep documentation up to date with code changes

#### Wiki Documentation
- Update relevant wiki pages when making significant changes
- Include information about new features
- Document breaking changes

## Pull Request Process

### Before Submitting
1. Ensure all tests pass
2. Update documentation if needed
3. Follow the code style guidelines
4. Write clear, descriptive commit messages
5. Squash related commits

### Pull Request Guidelines
1. Provide a clear title and description
2. Reference any related issues
3. Include screenshots for UI changes
4. Explain the problem and solution
5. Include testing instructions

### Review Process
1. Pull requests are reviewed by maintainers
2. Feedback will be provided within 48 hours
3. Changes may be requested
4. Once approved, PR will be merged

## Branching Strategy

### Main Branches
- `main`: Production-ready code
- `develop`: Development branch for next release

### Feature Branches
- Create feature branches from `develop`
- Use descriptive names (e.g., `feature/question-caching`)
- Delete branches after merging

### Release Branches
- Created from `develop` when preparing for release
- Merged to both `main` and `develop` upon release

## Issue Tracking

### Reporting Bugs
1. Check existing issues before creating a new one
2. Provide detailed steps to reproduce
3. Include environment information
4. Attach relevant logs or screenshots

### Requesting Features
1. Check if similar requests exist
2. Provide detailed use case description
3. Explain the value proposition
4. Include any relevant examples

## Recent Contribution Enhancements

### Upstash Services Migration
Contributors who worked on the Upstash services migration:
- Updated Docker configuration to use Upstash services
- Modified cache service and rate limiter to work with Upstash Redis
- Updated Upstash Search integration for keyword-based question generation
- Added documentation in `UPSTASH_MIGRATION_SUMMARY.md`
- Updated environment variables and connection strings

### Current Affairs Mode
Contributors who worked on the current affairs mode:
- Implemented new generation mode for current affairs integration
- Added news API integration for up-to-date content
- Updated UI components for current affairs mode selection
- Added documentation for current affairs mode

### Database Schema Updates
Contributors who worked on database schema updates:
- Added migration files for model tracking
- Added migration files for feedback categorization
- Added migration files for keyword and current affairs mode support
- Updated database schema documentation

### Model Provider Expansion
Contributors who worked on model provider expansion:
- Added support for Google Gemini
- Improved model selection algorithms
- Enhanced error handling and fallback mechanisms

## Code of Conduct

### Our Pledge
We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards
Examples of behavior that contributes to creating a positive environment include:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Our Responsibilities
Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

### Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team. All complaints will be reviewed and investigated and will result in a response that is deemed necessary and appropriate to the circumstances.

## Recognition

### Contributors
We appreciate all contributions, whether they're code, documentation, bug reports, or feature requests. Contributors will be recognized in:
- Release notes
- Contributor list
- Hall of fame (for significant contributions)

### Acknowledgements
Special thanks to:
- UPSC community for inspiration and feedback
- Open source contributors for libraries and tools
- Early adopters for testing and feedback
- Documentation contributors for improving project clarity

## Getting Help

### Community Support
- GitHub Discussions for general questions
- Issues for bug reports and feature requests
- Documentation for self-help

### Maintainer Support
- Direct contact for urgent issues
- Code review assistance
- Architecture guidance

### Learning Resources
- Project documentation
- Codebase exploration
- Pair programming sessions (by request)