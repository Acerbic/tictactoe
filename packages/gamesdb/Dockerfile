FROM node:lts-alpine

# yarn for lock file
RUN apk add yarn

# need bash for the wait script
RUN apk add bash
CMD ["./wait-for-it.sh", "prisma:4466", "-s", "-t", "0", "--", "npm", "run", "prisma", "deploy"]

WORKDIR /app
COPY ["package.json", "yarn.lock", "./"]
# installing prisma for "prisma deploy" later
RUN yarn --pure-lockfile --ignore-scripts && yarn cache clean

# copying prisma datamodel and prisma.yml
COPY . .