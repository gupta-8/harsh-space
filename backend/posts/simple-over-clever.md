---
title: simple > clever, a year of commits
date: 2026-10-27
description: what my github says about me, read back honestly.
---

My GitHub profile README is a PHP class. It has a `$profile` array, a `stack()` method, a `work()` method and a `principles()` method, and the motto field says `Simple > Clever.` I wrote that before most of the repositories under it existed, so today, with 576 contributions in the last year sitting on the graph, I went back to check whether the code kept the promise.

## the portfolio with no framework

The most-starred thing I have is [incredible-portfolio](https://github.com/gupta-8/incredible-portfolio), and it is almost aggressively plain: a router that whitelists four pages, a shared `header.php` and `footer.php`, one `data/projects.php` array to edit, and a contact form with a CSRF token that writes messages to a CSV file and tries `mail()` if the host allows it. No Composer, no dependencies, PHP 8 and a directory.

I keep expecting to be embarrassed by it and I keep not being. Every portfolio tutorial reaches for a framework on the first line; this one runs on any shared host that has ever existed and you can read the whole thing in the time it takes `npm install` to finish elsewhere. That is the "simple" half of the motto, and it is the half people underrate.

## the one with everything

Then there is [nextjs-blog](https://github.com/gupta-8/nextjs-blog), which is the opposite animal: Next.js 14 on the front, FastAPI and MongoDB behind it, JWT auth, file storage, and an admin CMS with a markdown editor, categories, tags, featured posts and reading-time estimates. The navigation is a liquid-glass bar with an SVG gooey filter and a hover bubble that follows you around.

It has more forks than stars, which I think is the right ratio for a template. People take it and make it theirs. It is also where I learned that "clever" is not the enemy of "simple" as long as the cleverness is contained: the glass effect is one component and a filter; the rest of the app is boring on purpose.

## a wordpress plugin, because i still love wordpress

[wp-dark-mode](https://github.com/gupta-8/wp-dark-mode) adds a dark theme to any WordPress site: a floating toggle, OS preference detection, a palette you can edit from the admin, scheduling (8 pm to 6 am, say), page exclusions, and four filter hooks for developers who want to bend it. The frontend is about 3 KB of vanilla JavaScript, no jQuery, and it only loads when the feature is switched on.

Writing a plugin for other people's sites is a good discipline. You cannot assume the theme, the host, the PHP version or the visitor. `[data-wpdm-dark]` on the root element and CSS variables for every colour was the least invasive design I could find, and "least invasive" turned out to be the whole design.

## what the rest of the graph says

The smaller repos fill in the picture: a FastAPI project called [Railway](https://github.com/gupta-8/Railway) that does graph-based route optimisation for trips and bookings; a pair of [launchkit](https://github.com/gupta-8/launchkit-backend) repos with JWT, 2FA, multi-tenant orgs, Stripe billing and API keys on the backend and a dark React dashboard on the front; a [code snippet manager](https://github.com/gupta-8/code-snippet); a set of [liquid glass components](https://github.com/gupta-8/react-liquid) in React. PHP and Python on the server, JavaScript and React in the browser, WordPress whenever a client says the word. Exactly what the README claims, which is a relief.

## the principles, graded

The `principles()` method returns four strings:

```php
public function principles(): array
{
    return [
        'Profile before optimizing',
        'Performance is a feature',
        'Security by default',
        'Code for humans first',
    ];
}
```

One year in:

- **profile before optimizing** — mostly kept. The portfolio has nothing to optimise; the Next.js app needed a profiler before I touched the glass filter.
- **performance is a feature** — kept where it mattered. 3 KB plugins and framework-free PHP are the proof.
- **security by default** — kept on the surfaces that face strangers: CSRF on the contact form, JWT and 2FA on launchkit, server-side validation everywhere a form exists.
- **code for humans first** — the one I would grade hardest. Some of these READMEs are better than the code they describe. Working on it.

---

This site is the newest repository on the list. It is a port of [rex.wf](https://rex.wf), with permission and with thanks, filled in with my own things: a small planet made of characters where his rose was, my commits in the "build things" card, and this post as the first real line in the guestbook of my own writing. Say hi back.
