# Avalon

The Resistance: Avalon, played from phones around one table. One person creates a room, and everyone else joins with the 4-letter code or an invite link.

## Playing

- **5 to 10 players.** Quest sizes, the evil count, and the rule that quest 4 needs two Fail cards with 7+ players all match the box.
- **Role setups:** the host picks one before dealing.
  - **Merlin & Assassin**
  - **Full set:** every special role that fits the player count. Evil roles are added in the order Morgana, Mordred, Oberon, until the evil seats run out. So Oberon only appears with 10 players.
  - **Custom:** pick roles yourself.
  - **No special roles**

  A role that needs another (Percival needs Merlin, Morgana needs Percival, Mordred needs Merlin) switches off with it, because on its own it would change nothing.
- **Lady of the Lake (optional):** used after quests 2, 3 and 4. Only the holder sees the result. Players who have held her can't be examined.
- **Assassination:** if good wins three quests, evil is revealed and the Assassin gets one guess at Merlin.

## Learning the game

New players can tap **Learn to play** on the home page, or the **?** button in any room, for an eight-step walkthrough. It includes a practice table: you pick a team, vote with the real tokens and see the reveal, and play a quest card as loyal or evil (and see why a loyal player can't play Fail). Nothing in the practice touches the real game, so it's safe to open mid-round.

## The screen

Each room is one tabletop scene rather than a page of boxes.

- **The Round Table.** Seats run clockwise in turn order. The tabletop holds the five quest medallions and the rejected-team track. Tap a finished medallion to see who went and how many Fail cards were played.
- **Your hand.** Everything you can do right now sits at the foot of the table: proposing a team, the Approve/Reject tokens, the two quest cards, the Lady, the Assassin's choice. On laptops it sits beside the table so nothing scrolls out of view.
- **Live team building.** As the leader taps seats, everyone watches the shields appear. The team forms in front of the table instead of arriving all at once.
- **Last vote on the seats.** While a quest is underway, or after a team is rejected, each seat shows how that player voted. Reading votes is most of the game, so the votes stay where people are looking.
- **Player records.** Tap anyone to see every vote they cast, the quests they joined, and how many of those failed. You can mark them **Trust** or **Suspect**. Your marks are private and stay on your phone for that game only.
- **Avatars.** Pick a crest (helm, crown, crossed swords, tower, rose, moon, owl, wolf, stag, raven and more) and a colour before you create or join a room, or keep your initials. The crests are drawn in the same line style as the role cards, so they look identical on every phone. Your phone remembers the choice for next time. Tap your own seat at any point to change it.
- **Removing players.** In the lobby, the host taps a player's seat and taps *Remove* twice. The second tap is there so nobody gets kicked by a stray touch. The removed player is told why they're back at the join screen, and can rejoin with the code while the room is still in the lobby. Players can't be removed mid-game, because their seat holds a secret role; the host can end the game early from the chronicle instead.
- **Reactions.** Thumbs up, thumbs down, hmm, side-eye, shock and laughter pop up over your seat for the whole table, for when a vote goes sideways. They're drawn in the same line style as the crests rather than emoji, so they look the same on every phone.
- **Your role** is dealt face down. Tap to turn it over, so you choose when to look.
- **Table talk** (chat) is docked on wide screens and slides in from the side on phones. Each name is written in a light version of that player's avatar colour, so you can match a line to a seat at a glance. **The chronicle** keeps every proposal, vote and quest result, plus the roles in play.

### What stays secret

The server decides what each phone receives, so nobody can find another player's role in the browser's developer tools. Votes stay hidden until everyone has voted, and quest cards are shuffled so only the number of Fails is shown. Good and evil players see the same two quest cards: a glance at someone's screen gives nothing away, and the server rejects a Fail from a loyal player.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Locally, rooms are kept in memory, so no database is needed. Other devices on your Wi-Fi can join at `http://<your-computer's-IP>:3000`.

To check the rules, run `npm run simulate` in a second terminal while the dev server is running. It plays five complete games through the API: different player counts, an assassination that hits and one that misses, five rejections, and three failed quests. It checks that hidden information never leaks.

## Deploy to Vercel

Vercel functions don't share memory, so rooms are stored in Upstash Redis (free tier).

1. Import this repository at vercel.com/new.
2. In the Vercel project, open **Storage**, create a Redis database (Upstash for Redis or Vercel's own Redis, both have free plans) and connect it to the project. Tick every environment you deploy to (Production, and Preview if you use preview links).
3. **Redeploy.** A deployment only gets the variables that existed when it was built, so connecting the store isn't enough on its own.

The app finds Redis by itself. It accepts Upstash's REST variables (`KV_REST_API_URL` + `KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, with or without a custom prefix) or a `redis://` connection string in `REDIS_URL`. REST is preferred because it needs no open connection.

If storage still isn't reachable, creating a room shows an error. It names the environment (production or preview) and lists which Redis-related variable names the deployment can see, without their values. "No Redis variables at all" means the store isn't connected to that environment or the deployment predates it. "Can see X but no usable…" means the store is connected but its variables are in an unexpected form.

Rooms expire 12 hours after their last change. Each phone checks for updates about once a second, or every 4 seconds when the tab is in the background. A 10-player game for an hour uses roughly 30k Redis commands, well within Upstash's free tier.
