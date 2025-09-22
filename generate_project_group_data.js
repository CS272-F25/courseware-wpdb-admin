import crypto from 'crypto';
import fs from 'fs';

const STUDENTS = JSON.parse(fs.readFileSync('enriched_CMS_Project_Groups.secret.json'));
const SEED = fs.readFileSync('seed.secret').toString().trim();

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const student_sql = STUDENTS.map(student => {
  // modifying the array elements in-place as a side-effect
  student.password = crypto
    .createHmac("SHA256", SEED)
    .update(student.netId)
    .digest("hex")
    .substring(0, 16);
  student.url = `https://cs272-wordpress.cs.wisc.edu/f25/p${student.group}-site/wp-admin/`
  
  return {
    group: student.group,
    netid: student.netId,
    sql: `USE cs272_wp_P${student.group};
START TRANSACTION;
INSERT INTO wp_users (user_login,user_nicename,user_email,display_name,user_pass,user_registered) VALUES ('${student.netId}','${slugify(student.first)}-${slugify(student.last)}','${student.email}','${student.first} ${student.last}',MD5('${student.password}'),NOW());
SET @new_user_id = LAST_INSERT_ID();
INSERT INTO wp_usermeta (user_id,meta_key,meta_value) VALUES (@new_user_id,'nickname','${student.first}');
INSERT INTO wp_usermeta (user_id,meta_key,meta_value) VALUES (@new_user_id,'first_name','${student.first}');
INSERT INTO wp_usermeta (user_id,meta_key,meta_value) VALUES (@new_user_id,'last_name','${student.last}');
INSERT INTO wp_usermeta (user_id,meta_key,meta_value) VALUES (@new_user_id,'wp_capabilities','a:1:{s:13:"administrator";b:1;}');
INSERT INTO wp_usermeta (user_id,meta_key,meta_value) VALUES (@new_user_id,'default_password_nag','1');
INSERT INTO wp_usermeta (user_id,meta_key,meta_value) VALUES (@new_user_id,'rich_editing','true');
`
  }
// note we specifically DON'T put "COMMIT;" in here:
  //   when we copy and paste this in, manually confirm there are no errors
  //   before manually entering "COMMIT;"
})

for (const { group, netid, sql } of student_sql) {
  fs.writeFileSync(`project_groups/p${group}.${netid}.sql`, sql);
}

// note: json-to-csv utility in courseware-canvas-tools repo can
//   turn this JSON into a spreadsheet easily
fs.writeFileSync(
  `project_groups/mail_merge_data.json`,
  JSON.stringify(STUDENTS, null, 2)
)
