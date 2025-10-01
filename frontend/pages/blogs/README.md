# IntrepidQ Nextra Blog

This directory contains the Nextra-powered blog for IntrepidQ.

## Structure

- `_meta.js` - Navigation configuration
- `index.mdx` - Main blog index page
- `*.mdx` - Individual blog posts

## Creating New Posts

1. Create a new `.mdx` file with the post content
2. Add frontmatter metadata at the top of the file:
   ```mdx
   ---
   title: Post Title
   date: 2025-01-01
   description: Brief description of the post
   ---
   ```
3. Add the post to `_meta.js` for navigation
4. Update the index page if needed

## Access

The blog is accessible at `/blogs` in the application.

## Features

The Nextra blog provides:

- Automatic routing based on file structure
- Built-in search functionality
- Responsive design
- Syntax highlighting for code blocks
- Table of contents generation
- SEO optimization