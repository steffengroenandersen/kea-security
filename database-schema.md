Database Schema
user

user_id: integer (primary key)
user_uuid: text (unique, internal reference)
user_public_uuid: text (unique, public-facing)
email: text (unique)
password_hash: text

session

session_id: integer (primary key)
session_token: text (unique)
user_id: integer (foreign key → user.user_id)
expires_at: timestamp

business

business_id: integer (primary key)
business_uuid: text (unique, internal reference)
business_public_uuid: text (unique, public-facing)
name: text
logo_url: text (nullable)

user_business

user_business_id: integer (primary key)
user_id: integer (foreign key → user.user_id)
business_id: integer (foreign key → business.business_id)
role: text ('admin' or 'member')

portfolio

portfolio_id: integer (primary key)
portfolio_uuid: text (unique, internal reference)
portfolio_public_uuid: text (unique, public-facing)
business_id: integer (foreign key → business.business_id)
title: text
visibility: text ('visible' or 'hidden')

comment

comment_id: integer (primary key)
comment_uuid: text (unique, internal reference)
portfolio_id: integer (foreign key → portfolio.portfolio_id)
user_id: integer (foreign key → user.user_id)
content: text
created_at: timestamp
