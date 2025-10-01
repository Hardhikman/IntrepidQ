# Using Nextra for Blog

This document explains how to use Nextra for the blog functionality in IntrepidQ.

## Blog Structure

The blog is organized in the `pages/blogs` directory with the following structure:

```
pages/
  blogs/
    _meta.js          # Navigation configuration
    index.mdx         # Blog index page
    *.mdx             # Individual blog posts
    README.md         # Documentation for the blog system
```

## Creating New Blog Posts

To create a new blog post:

1. Create a new `.mdx` file in the `pages/blogs` directory
2. Add frontmatter metadata at the top of the file:
   ```mdx
   ---
   title: Your Blog Post Title
   date: 2025-01-01
   description: Brief description of the post
   ---
   ```
3. Write your content in Markdown format
4. Add the post to the `_meta.js` file for navigation

## Blog Navigation

The `_meta.js` file controls the navigation and ordering of blog posts:

```js
module.exports = {
  index: {
    title: "Blog Home"
  },
  "your-post-slug": {
    title: "Your Post Title"
  }
};
```

## Features

The Nextra blog provides:

- Automatic routing based on file structure
- Built-in search functionality
- Responsive design
- Syntax highlighting for code blocks
- Table of contents generation
- SEO optimization

## Accessing the Blog

The blog can be accessed at `/blogs` route in the application.

## Blog Post Format

Blog posts should use MDX format with proper frontmatter. Here's a template:

```mdx
---
title: Your Blog Post Title
date: 2025-01-01
description: Brief description of the post
---

# Your Blog Post Title

Your content here...

## Subheading

More content...
```

## Maintenance

To maintain the blog:

1. Regularly update the `_meta.js` file when adding or removing posts
2. Keep the README.md file in the blogs directory up to date
3. Ensure all blog posts have proper frontmatter with title, date, and description
4. Test links and navigation after making changes