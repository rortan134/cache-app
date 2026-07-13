# Papercuts

Small frustrations logged by agents during work.

- [ ] Plasmo 0.90.5 build of extensions/cache-app requires an icons/icon.png at the project root be mirrored into assets/ so it can generate gen-assets/icon*.plasmo.png; meanwhile scripts/merge-legacy.mjs still copies icons/icon.png into the build output as an unused orphan. Single-source the icon (either Plasmo-generated gen-assets only, or pre-built icons only) so the build doesn't carry two copies and contributors don't have to mirror the file by hand. _(2026-07-12T20:32:15Z, branch: main)_
