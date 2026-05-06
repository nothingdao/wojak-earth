# Issue #14: Build chat rooms, groups, DMs, mentions, and social permissions

- Source: https://github.com/nothingdao/astrds/issues/14
- State: OPEN
- Labels: proposed, area:frontend, area:social, type:implementation, priority:medium
- Assignees: none
- Created: 2026-04-27T00:18:37Z
- Updated: 2026-04-30T01:39:01Z

## Body

## Summary

Build ASTRDS chat into a fuller social layer with public chat, DMs, groups/rooms, mentions, simple replies, notifications, moderation, and live-game chat integration.

Memberships and liquidity boosts have been split into #21. This issue should focus on chat/social functionality and permissions.

## Product direction

Skip Signal/E2EE for now. “Private” means access-controlled by Convex permissions, not end-to-end encrypted.

Group/community roles should be simple and X-like:

```text
owner
admin
mod
member
```

## Chat surfaces

### 1. In-game chat panel

Compact and low-distraction.

Possible room tabs:

```text
Public
Group / Crew
This Run
```

If a player belongs to multiple groups, tabs could be configurable or show the selected group:

```text
Public | My Crew | This Run
```

Use cases:

- public firehose while playing
- group-only chat while playing
- live game / spectator chat
- quick replies
- @mentions
- unread dots/counts

Should avoid becoming a full Discord-style UI inside gameplay.

### 2. Full Chat overlay

Feature-complete chat app / social hub.

Potential sections:

```text
Public
DMs
Groups
Live Games
Mentions
Unread
```

Features:

- global/public chat
- DMs
- groups / rooms
- owner/admin/mod/member roles
- create group
- invite/remove members
- room visibility/settings
- @mentions
- one-level replies with quoted parent preview
- notifications / unread counts
- mute room/user
- block wallet
- moderation tools
- live game rooms

## Rooms and permissions

Model public/group/game/DM chat as rooms rather than one-off per-message privacy.

Possible room kinds:

```ts
'global' | 'group' | 'game' | 'dm'
```

Possible group visibility:

```ts
'public' | 'private' | 'hidden'
```

Possible posting permission:

```ts
'everyone' | 'members' | 'mods' | 'admins'
```

Global chat can use a spam-resistant permission layer such as:

```text
recent player OR active member/allowed wallet
```

Group chat uses group membership/roles.

## Replies / threading

Keep replies intentionally simple:

- one-level replies only
- show quoted parent preview
- click/tap parent preview scrolls/highlights original
- no Reddit-style nested tree UI
- if replying to a reply, either reference immediate parent or normalize to root; decide during implementation

## Mentions

Support @mentions in all rooms where the mentioned user is visible/eligible.

Later this can drive:

- mention notifications
- Mentions inbox
- unread badges

## Live game integration

This dovetails with #20.

Each live game can have stream visibility and optionally a game chat room:

```ts
streamVisibility: 'public' | 'group' | 'private'
streamGroupId?: Id<'chatRooms'> // or group id
```

Examples:

```text
Public stream
→ anyone can discover/watch
→ public or run-specific chat

Group-only stream
→ only group members can discover/watch
→ group/run chat scoped to that group

Private/hidden stream
→ not listed and not watchable unless explicitly invited later
```

The same group permission model should govern both:

- who can read/post in group chat
- who can watch group-scoped live games

Server-side spectator permissions must be enforced on the game server/Convex path, not just hidden in the frontend.

## Possible schema direction

```ts
chatRooms: defineTable({
  kind: v.union(
    v.literal('global'),
    v.literal('group'),
    v.literal('game'),
    v.literal('dm')
  ),
  name: v.optional(v.string()),
  ownerWalletAddress: v.optional(v.string()),
  visibility: v.union(
    v.literal('public'),
    v.literal('private'),
    v.literal('hidden')
  ),
  postPermission: v.union(
    v.literal('everyone'),
    v.literal('members'),
    v.literal('mods'),
    v.literal('admins')
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

```ts
chatRoomMembers: defineTable({
  roomId: v.id('chatRooms'),
  walletAddress: v.string(),
  role: v.union(
    v.literal('owner'),
    v.literal('admin'),
    v.literal('mod'),
    v.literal('member')
  ),
  joinedAt: v.number(),
})
  .index('by_room', ['roomId'])
  .index('by_wallet', ['walletAddress'])
```

```ts
chatMessages: defineTable({
  roomId: v.id('chatRooms'),
  walletAddress: v.string(),
  body: v.string(),
  mentions: v.array(v.string()),
  replyToMessageId: v.optional(v.id('chatMessages')),
  createdAt: v.number(),
  editedAt: v.optional(v.number()),
  deletedAt: v.optional(v.number()),
})
  .index('by_room_created', ['roomId', 'createdAt'])
```

Additional likely tables:

```text
chatNotifications
chatMutes
chatBlocks
chatReports
```

## Recommended build order

1. Chat rooms foundation: global room + message roomId migration.
2. Permission helpers: canReadRoom / canPostRoom.
3. @mentions and one-level replies.
4. In-game compact chat panel room tabs.
5. Full Chat overlay with Public / DMs / Groups / Mentions / Unread.
6. Group creation and owner/admin/mod/member management.
7. Moderation: delete, mute, block, report.
8. Live game room + spectator permission integration with #20.


## Comments

### whaleen — 2026-04-29T21:40:49Z

Expanding this issue beyond basic posting permissions: chat should probably become a fuller ASTRDS social layer, with the in-game chat panel as a compact surface and a full Chat overlay as the feature-complete client.

## Updated product direction

Skip Signal/E2EE for now. “Private” means access-controlled by Convex permissions, not end-to-end encrypted.

Also avoid patron-style concepts. Group/community roles should be simple and X-like:

```text
owner
admin
mod
member
```

## Chat surfaces

### 1. In-game chat panel

Compact and low-distraction.

Possible room tabs:

```text
Public
Group / Crew
This Run
```

If a player belongs to multiple groups, tabs could be configurable or show the selected group:

```text
Public | My Crew | This Run
```

Use cases:

- public firehose while playing
- group-only chat while playing
- live game / spectator chat
- quick replies
- @mentions
- unread dots/counts

Should avoid becoming a full Discord-style UI inside gameplay.

### 2. Full Chat overlay

Feature-complete chat app / social hub.

Potential sections:

```text
Public
DMs
Groups
Live Games
Mentions
Unread
```

Features:

- global/public chat
- DMs
- groups / rooms
- owner/admin/mod/member roles
- create group
- invite/remove members
- room visibility/settings
- @mentions
- one-level replies with quoted parent preview
- notifications / unread counts
- mute room/user
- block wallet
- moderation tools
- live game rooms

## Rooms and permissions

Model public/group/game/DM chat as rooms rather than one-off per-message privacy.

Possible room kinds:

```ts
'global' | 'group' | 'game' | 'dm'
```

Possible group visibility:

```ts
'public' | 'private' | 'hidden'
```

Possible posting permission:

```ts
'everyone' | 'members' | 'mods' | 'admins'
```

Global chat can still use the spam-resistant permission layer from the original issue:

```text
recent player OR active member/allowed wallet
```

Group chat uses group membership/roles.

## Replies / threading

Keep replies intentionally simple:

- one-level replies only
- show quoted parent preview
- click/tap parent preview scrolls/highlights original
- no Reddit-style nested tree UI
- if replying to a reply, either reference immediate parent or normalize to root; decide during implementation

## Mentions

Support @mentions in all rooms where the mentioned user is visible/eligible.

Later this can drive:

- mention notifications
- Mentions inbox
- unread badges

## Live game integration

This dovetails with #20.

Each live game can have stream visibility and optionally a game chat room:

```ts
streamVisibility: 'public' | 'group' | 'private'
streamGroupId?: Id<'chatRooms'> // or group id
```

Examples:

```text
Public stream
→ anyone can discover/watch
→ public or run-specific chat

Group-only stream
→ only group members can discover/watch
→ group/run chat scoped to that group

Private/hidden stream
→ not listed and not watchable unless explicitly invited later
```

The same group permission model should govern both:

- who can read/post in group chat
- who can watch group-scoped live games

Server-side spectator permissions must be enforced on the game server/Convex path, not just hidden in the frontend.

## Possible schema direction

```ts
chatRooms: defineTable({
  kind: v.union(
    v.literal('global'),
    v.literal('group'),
    v.literal('game'),
    v.literal('dm')
  ),
  name: v.optional(v.string()),
  ownerWalletAddress: v.optional(v.string()),
  visibility: v.union(
    v.literal('public'),
    v.literal('private'),
    v.literal('hidden')
  ),
  postPermission: v.union(
    v.literal('everyone'),
    v.literal('members'),
    v.literal('mods'),
    v.literal('admins')
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

```ts
chatRoomMembers: defineTable({
  roomId: v.id('chatRooms'),
  walletAddress: v.string(),
  role: v.union(
    v.literal('owner'),
    v.literal('admin'),
    v.literal('mod'),
    v.literal('member')
  ),
  joinedAt: v.number(),
})
  .index('by_room', ['roomId'])
  .index('by_wallet', ['walletAddress'])
```

```ts
chatMessages: defineTable({
  roomId: v.id('chatRooms'),
  walletAddress: v.string(),
  body: v.string(),
  mentions: v.array(v.string()),
  replyToMessageId: v.optional(v.id('chatMessages')),
  createdAt: v.number(),
  editedAt: v.optional(v.number()),
  deletedAt: v.optional(v.number()),
})
  .index('by_room_created', ['roomId', 'createdAt'])
```

Additional likely tables:

```text
chatNotifications
chatMutes
chatBlocks
chatReports
```

## Revised recommended build order

1. Chat rooms foundation: global room + message roomId migration.
2. Permission helpers: canReadRoom / canPostRoom.
3. @mentions and one-level replies.
4. In-game compact chat panel room tabs.
5. Full Chat overlay with Public / DMs / Groups / Mentions / Unread.
6. Group creation and owner/admin/mod/member management.
7. Moderation: delete, mute, block, report.
8. Live game room + spectator permission integration with #20.


### whaleen — 2026-04-29T21:42:26Z

Split memberships and liquidity boosts out into #21 so this issue can stay focused on chat/social permissions, rooms, groups, DMs, mentions, replies, notifications, moderation, and live-game chat integration.

