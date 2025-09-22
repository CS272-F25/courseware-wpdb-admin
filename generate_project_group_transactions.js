import crypto from 'crypto';
import fs from 'fs';

const STUDENTS = JSON.parse(fs.readFileSync('enriched_CMS_Project_Groups.secret.json'));
const SEED = fs.readFileSync('seed.secret').toString().trim();

const GROUP_TRANSACTIONS = new Map();

STUDENTS.forEach(student => {
  const netid = student.netId;
  const email = student.email;
  const password = crypto.createHmac("SHA256", SEED).update(netid).digest("hex").substring(0, 16);
  const display_name = `${student.first} ${student.last}`;

  const existing_group = GROUP_TRANSACTIONS.get(student.group) ?? [];

  // thanks ChatGPT for the SQL
  const transaction = `
START TRANSACTION;

-- 1) Insert user into wp_users
INSERT INTO wp_users (
    user_login,
    user_pass,
    user_nicename,
    user_email,
    user_url,
    user_registered,
    user_activation_key,
    user_status,
    display_name
) VALUES (
    '${netid}', -- user_login
    MD5('${password}'), -- user_pass (WordPress will rehash on login)
    '${netid}', -- user_nicename
    '${email}', -- user_email
    '', -- user_url
    NOW(), -- user_registered
    '', -- user_activation_key
    0, -- user_status
    '${display_name}' -- display_name
);

-- 2) Capture the ID of the user we just created
SET @new_user_id = LAST_INSERT_ID();

-- 3) Recommend password change
INSERT INTO wp_usermeta (
    user_id,
    meta_key,
    meta_value
) VALUES (
    @new_user_id,
    'default_password_nag',
    '1'
);

-- 4) Assign user role
INSERT INTO wp_usermeta (
    user_id,
    meta_key,
    meta_value
) VALUES (
    @new_user_id,
    'wp_capabilities',
    'a:1:{s:13:"administrator";b:1;}'
);

COMMIT;

`
  GROUP_TRANSACTIONS.set(student.group, [...existing_group, transaction])
})

for (const [group, transaction_array] of GROUP_TRANSACTIONS.entries()) {
  const output = [`USE cs272_wp_P${group};\n`, ...transaction_array].join("\n");
  fs.writeFileSync(`project_group_transactions/p${group}.sql`, output);
}
