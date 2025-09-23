# CS272 wpdb-admin

Tools for working with WordPress hosted via docker-compose with one container per student and one container per project group.

## Initializing Containers

Create three files: `root.secret`, `seed.secret`, `students.secret`.

 - `root.secret` should contain the root password for the MySQL database. You make this up, but make it secure. 16+ characters, numbers, letters, symbols, etc.
 - `seed.secret` should contain a random seed for generating student db passwords. Again, make this secure.
 - `students.secret` should contain every student's @wisc.edu email address, newline delimited,

When this is done, simply run `node index.js` in this directory. A file, `gen.secret.md`, will be generated telling you what to do next.


## Generating SQL to add students to project containers

Create a file: `enriched_CMS_Project_Groups.secret.json` which should be of the following format:

```json
[
  {
    "SIS": "UWXXXXXXX",
    "group": "1",
    "first": "first",
    "last": "last",
    "netId": "netid",
    "email": "netid@wisc.edu"
  },
  ...
]
```

Then run `node generate_project_group_data.js`. The `project_groups/` directory will be populated with `mail_merge_data.json` and one SQL file per student. You will need to copy and paste the SQL into the Portainer console after logging in to the MySQL database as root.
