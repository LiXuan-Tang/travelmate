# TravelMate ERD

SVG version: [erd.svg](./erd.svg)

```mermaid
%%{init: {"flowchart": {"curve": "stepAfter", "htmlLabels": true}} }%%
flowchart LR
  db["<b>Database Name:</b><br/>TravelMate"]

  user["<table>
    <tr><th colspan='2'>user</th></tr>
    <tr><td><b>PK</b></td><td><u>userId</u></td></tr>
    <tr><td></td><td>uid</td></tr>
    <tr><td></td><td>email</td></tr>
    <tr><td></td><td>displayName</td></tr>
    <tr><td></td><td>photoURL</td></tr>
    <tr><td></td><td>bio</td></tr>
    <tr><td></td><td>isAdmin</td></tr>
    <tr><td></td><td>likedPostIds</td></tr>
    <tr><td></td><td>savedPostIds</td></tr>
    <tr><td></td><td>createdAt</td></tr>
    <tr><td></td><td>updatedAt</td></tr>
  </table>"]

  trip["<table>
    <tr><th colspan='2'>trip</th></tr>
    <tr><td><b>PK</b></td><td><u>tripId</u></td></tr>
    <tr><td><b>FK</b></td><td>ownerId</td></tr>
    <tr><td><b>FK</b></td><td>collaboratorIds</td></tr>
    <tr><td></td><td>title</td></tr>
    <tr><td></td><td>coverImage</td></tr>
    <tr><td></td><td>startDate</td></tr>
    <tr><td></td><td>endDate</td></tr>
    <tr><td></td><td>visibility</td></tr>
    <tr><td></td><td>createdAt</td></tr>
    <tr><td></td><td>updatedAt</td></tr>
  </table>"]

  destination["<table>
    <tr><th colspan='2'>destination</th></tr>
    <tr><td><b>PK</b></td><td><u>destinationId</u></td></tr>
    <tr><td><b>FK</b></td><td>tripId</td></tr>
    <tr><td></td><td>placeId</td></tr>
    <tr><td></td><td>name</td></tr>
    <tr><td></td><td>address</td></tr>
    <tr><td></td><td>photoReference</td></tr>
    <tr><td></td><td>lat</td></tr>
    <tr><td></td><td>lng</td></tr>
    <tr><td></td><td>date</td></tr>
    <tr><td></td><td>notes</td></tr>
    <tr><td></td><td>order</td></tr>
    <tr><td></td><td>createdAt</td></tr>
  </table>"]

  post["<table>
    <tr><th colspan='2'>post</th></tr>
    <tr><td><b>PK</b></td><td><u>postId</u></td></tr>
    <tr><td><b>FK</b></td><td>authorId</td></tr>
    <tr><td><b>FK</b></td><td>tripId</td></tr>
    <tr><td></td><td>title</td></tr>
    <tr><td></td><td>body</td></tr>
    <tr><td></td><td>images</td></tr>
    <tr><td></td><td>destination</td></tr>
    <tr><td></td><td>tags</td></tr>
    <tr><td></td><td>likesCount</td></tr>
    <tr><td></td><td>commentsCount</td></tr>
    <tr><td></td><td>visibility</td></tr>
    <tr><td></td><td>type</td></tr>
    <tr><td></td><td>destinationCount</td></tr>
    <tr><td></td><td>tripDuration</td></tr>
    <tr><td></td><td>createdAt</td></tr>
    <tr><td></td><td>updatedAt</td></tr>
  </table>"]

  comment["<table>
    <tr><th colspan='2'>comment</th></tr>
    <tr><td><b>PK</b></td><td><u>commentId</u></td></tr>
    <tr><td><b>FK</b></td><td>postId</td></tr>
    <tr><td><b>FK</b></td><td>authorId</td></tr>
    <tr><td></td><td>text</td></tr>
    <tr><td></td><td>createdAt</td></tr>
  </table>"]

  db --> user
  user -->|"owns 0...*"| trip
  user -->|"collaborates 0...*"| trip
  trip -->|"0...*"| destination
  user -->|"authors 0...*"| post
  trip -->|"0...*"| post
  post -->|"0...*"| comment
  user -->|"writes 0...*"| comment
  user -->|"likes/saves 0...*"| post

  classDef tableBox fill:#ffffff,stroke:#333333,stroke-width:1px,color:#000000;
  classDef dbBox fill:#ffffff,stroke:#333333,stroke-width:1px,color:#000000;
  class user,trip,destination,post,comment tableBox;
  class db dbBox;
```

## Relationship Labels

| Relationship | Meaning |
| --- | --- |
| `user owns 0...* trip` | A user may own zero or more trips. |
| `user collaborates 0...* trip` | A user may collaborate on zero or more trips. |
| `trip 0...* destination` | A trip may contain zero or more destinations. |
| `user authors 0...* post` | A user may author zero or more posts. |
| `trip 0...* post` | A trip may be published as zero or more shared-itinerary posts. |
| `post 0...* comment` | A post may have zero or more comments. |
| `user 0...* comment` | A user may write zero or more comments. |
| `user 0...* post` | A user may like or save zero or more posts through `likedPostIds` and `savedPostIds`. |
