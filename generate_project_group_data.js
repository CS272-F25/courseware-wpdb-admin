import fs from 'fs';

const GROUPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 17, 19, 20, 22];
const zihan = {
  password: null, // redacted
  netId: "zgao247",
  first: "Zihan",
  last: "Gao",
  email: "zgao247@wisc.edu"
} 

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

console.log(JSON.stringify(GROUPS.map(group => `https://cs272-wordpress.cs.wisc.edu/f25/p${group}-site/wp-admin/`), null, 2))

const sql_array = GROUPS.map(group => ({
    group,
    netid: zihan.netId,
    sql: `USE cs272_wp_P${group};
START TRANSACTION;
INSERT INTO wp_users (user_login,user_nicename,user_email,display_name,user_pass,user_registered) VALUES ('${zihan.netId}','${slugify(zihan.first)}-${slugify(zihan.last)}','${zihan.email}','${zihan.first} ${zihan.last}',MD5('${zihan.password}'),NOW());
SET @new_user_id = LAST_INSERT_ID();
INSERT INTO wp_usermeta (user_id,meta_key,meta_value) VALUES (@new_user_id,'nickname','${zihan.first}');
INSERT INTO wp_usermeta (user_id,meta_key,meta_value) VALUES (@new_user_id,'first_name','${zihan.first}');
INSERT INTO wp_usermeta (user_id,meta_key,meta_value) VALUES (@new_user_id,'last_name','${zihan.last}');
INSERT INTO wp_usermeta (user_id,meta_key,meta_value) VALUES (@new_user_id,'wp_capabilities','a:1:{s:13:"administrator";b:1;}');
INSERT INTO wp_usermeta (user_id,meta_key,meta_value) VALUES (@new_user_id,'rich_editing','true');
`
  }
// note we specifically DON'T put "COMMIT;" in here:
  //   when we copy and paste this in, manually confirm there are no errors
  //   before manually entering "COMMIT;"
))

for (const { group, netid, sql } of sql_array) {
  fs.writeFileSync(`project_groups/p${group}.${netid}.sql`, sql);
}
