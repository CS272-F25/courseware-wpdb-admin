import crypto from 'crypto';
import fs from 'fs';

const STUDENTS = JSON.parse(fs.readFileSync('enriched_CMS_Project_Groups.secret.json'));
const SEED = fs.readFileSync('seed.secret').toString().trim();

const SQL_BY_GROUP = new Map();

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const mailMergeData = STUDENTS.map(student => {
  const netid = student.netId;
  const password = crypto.createHmac("SHA256", SEED).update(netid).digest("hex").substring(0, 16);

  const existing_group = SQL_BY_GROUP.get(student.group) ?? [];

  const creation_sql = `
INSERT INTO wp_users (
    user_login,
    user_nicename,
    user_email,
    display_name,
    user_pass,
    user_registered
) VALUES (
    '${netid}', -- user_login
    '${slugify(student.first)}-${slugify(student.last)}', -- user_nicename, used as a slug in URLs
    '${student.email}', -- user_email
    '${student.first} ${student.last}', -- display_name
    MD5('${password}'), -- user_pass (WordPress will rehash on login)
    NOW() -- user_registered
);

SET @new_user_id = LAST_INSERT_ID();

INSERT INTO wp_usermeta (
    user_id,
    meta_key,
    meta_value
) VALUES (
    @new_user_id,
    'nickname',
    '${student.first}'
);

INSERT INTO wp_usermeta (
    user_id,
    meta_key,
    meta_value
) VALUES (
    @new_user_id,
    'first_name',
    '${student.first}'
);

INSERT INTO wp_usermeta (
    user_id,
    meta_key,
    meta_value
) VALUES (
    @new_user_id,
    'last_name',
    '${student.last}'
);

INSERT INTO wp_usermeta (
    user_id,
    meta_key,
    meta_value
) VALUES (
    @new_user_id,
    'wp_capabilities',
    'a:1:{s:13:"administrator";b:1;}'
);

-- Recommend password change
INSERT INTO wp_usermeta (
    user_id,
    meta_key,
    meta_value
) VALUES (
    @new_user_id,
    'default_password_nag',
    '1'
);

-- Enable block editor by default
INSERT INTO wp_usermeta (
    user_id,
    meta_key,
    meta_value
) VALUES (
    @new_user_id,
    'rich_editing',
    'true'
);

`
  SQL_BY_GROUP.set(student.group, [...existing_group, creation_sql])
  return {
    ...student,
    password,
    url: `https://cs272-wordpress.cs.wisc.edu/f25/p${student.group}-site/wp-admin/`
  }
})

for (const [group, sql_array] of SQL_BY_GROUP.entries()) {
  const output = [
    `USE cs272_wp_P${group};\n`, 
    `START TRANSACTION;\n`, 
    ...sql_array,
    // note we specifically DON'T put "COMMIT;" in here:
    //   when we copy and paste this in, manually confirm there are no errors
    //   before manually entering "COMMIT;"
  ].join("\n");
  
  fs.writeFileSync(`project_groups/p${group}.sql`, output);
}

fs.writeFileSync(`project_groups/mail_merge_data.json`, JSON.stringify(mailMergeData, null, 2))
