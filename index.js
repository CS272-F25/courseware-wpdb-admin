import crypto from 'crypto';
import fs from 'fs';

const WP_IMAGE_NAME = 'ctnelson1997/cs272-wordpress:6.8.2.0'; // update and rebuild with latest WP version semesterly
const SEMESTER = 'f25';
const BASE_PORT = 26000;

const ROOT = fs.readFileSync('root.secret').toString().trim();
const COMPOSE_HEADER = fs.readFileSync("compose.header.template").toString().replaceAll("{ROOT_PASSWORD}", ROOT);
const COMPOSE_FOOTER = fs.readFileSync("compose.footer.template").toString();
const TEMPL = fs.readFileSync('gen.md.template').toString();
const SEED = fs.readFileSync('seed.secret').toString().trim();

const STUDENTS = fs.readFileSync('students.secret')
    .toString()
    .trim()
    .split(/\r?\n/g)
    .map(t => t.trim());

const STUDENTS_PROCESSED = STUDENTS.map(stud => {
    const email = stud.toUpperCase();
    const username = email.split("@")[0];
    const db_name = `cs272_wp_${username}`
    const password = crypto.createHmac("SHA256", SEED).update(username).digest("hex").substring(0, 16);
    const working_dir = `/var/www/html/${SEMESTER}/${username.toLowerCase()}-site`
    const volume_name = `${db_name}_content:`;
    return { 
      email, 
      username, 
      db_name, 
      password,
      volume_name,
      working_dir
    }
})

let GEN = TEMPL;

GEN = GEN.replaceAll("{DOCKER_COMPOSE_INITIAL}", COMPOSE_HEADER + "\n" + COMPOSE_FOOTER);

GEN = GEN.replaceAll("{MYSQL_EXEC}", `mysql -uroot -p${ROOT}`);

GEN = GEN.replaceAll("{MYSQL_STUDENT_DB_CREATION}", STUDENTS_PROCESSED.map(stud => `
CREATE DATABASE \`${stud.db_name}\`;
CREATE USER '${stud.username}'@'%' IDENTIFIED BY '${stud.password}';
GRANT ALL PRIVILEGES ON \`${stud.db_name}\`.* TO '${stud.username}'@'%';
`.trim()).join("\n\n"));

const docker_compose_student_stacks = STUDENTS_PROCESSED.map((stud, i) => `
${stud.db_name}:
  image: ${WP_IMAGE_NAME}
  restart: always
  ports:
    - "${BASE_PORT + i + 1}:80"
  environment:
    WORDPRESS_DB_HOST: cs272_wp_shared_db
    WORDPRESS_DB_USER: ${stud.username}
    WORDPRESS_DB_PASSWORD: ${stud.password}
    WORDPRESS_DB_NAME: ${stud.db_name}
  working_dir: ${stud.working_dir}
  volumes:
    - ${stud.volume_name}${stud.working_dir}/wp-content
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.${stud.username}_wp.rule=Host(\`cs272-wordpress.cs.wisc.edu\`)&&PathPrefix(\`/${SEMESTER}/${stud.username.toLowerCase()}-site\`)"
  depends_on:
    cs272_wp_shared_db:
      condition: service_healthy    
`.trim().split(/\r?\n/g).map(t => `  ${t}`).join("\n")).join("\n")

const docker_compose_volumes = `
volumes:
  cs272_wp_shared_db:
` + STUDENTS_PROCESSED.map(({ volume_name }) => `  ${volume_name}`).join("\n")

GEN = GEN.replaceAll(
  "{DOCKER_COMPOSE_FINAL}", 
  COMPOSE_HEADER + "\n" + 
  docker_compose_student_stacks + "\n" + 
  docker_compose_volumes + "\n" + 
  COMPOSE_FOOTER
);

fs.writeFileSync("gen.secret.md", GEN)
