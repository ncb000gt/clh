clh
=

An attempt at getting 80-90% of the way through writing a changelog. The process
of doing this can be cumbersome. You need to convey the information to the
users, but you've largely already written those out, and often just need a
shortened version. That's what this helps with in an interactive way.


Usage
==

```
npm install clh
npx clh --from=[from] --to=[to]
```

Options
==

from and to
====

We're using git log internally, so you'll want to specify tags, commits, or
whatnot. I tag each version in my repository so for me it's usually
straightforward, for example:	`--from="v0.0.1" --to="v0.0.2"`.
