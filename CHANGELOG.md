# Changelog

## 1.0.0 (2026-03-03)


### Features

* **01-01:** add connection validation to startup sequence ([cae4cde](https://github.com/voyagi/upwork-mcp-server/commit/cae4cde52fa5109e2253dc5650502008f8ab8392))
* **01-01:** add env validation and connection testing to Supabase client ([b0ced16](https://github.com/voyagi/upwork-mcp-server/commit/b0ced16a3696a53d5964be828d3260896937171e))
* **01-02:** create Zod validation schemas for all MCP tools ([043a232](https://github.com/voyagi/upwork-mcp-server/commit/043a232d19bfda47c068281d5a75cdf060971ec2))
* **01-03:** implement schema introspection and resource handler ([5a36966](https://github.com/voyagi/upwork-mcp-server/commit/5a36966ad61483fab93f7d1fc4da69c061878dac))
* **01-03:** register schema resource in MCP server ([eaf3478](https://github.com/voyagi/upwork-mcp-server/commit/eaf34782239d32804efbedc8226cb53802fa367c))
* **02-01:** implement customer read tools ([df8d528](https://github.com/voyagi/upwork-mcp-server/commit/df8d52853487812f86999ac446905a745b66981a))
* **02-01:** implement product read tools ([a03184e](https://github.com/voyagi/upwork-mcp-server/commit/a03184e93df915f6f953841910874dcdd5f06a76))
* **02-01:** register customer and product tools in MCP server ([5d2c3d0](https://github.com/voyagi/upwork-mcp-server/commit/5d2c3d089d2654a5a52665289755f0fc1b829a56))
* **02-02:** implement ticket read tools with customer JOIN ([3a6ecad](https://github.com/voyagi/upwork-mcp-server/commit/3a6ecade9f096cd5d8404cd68aa79dc746ab2834))
* **02-02:** register ticket tools in MCP server ([b260267](https://github.com/voyagi/upwork-mcp-server/commit/b2602677957ae49bd9d1a745b9d0fdbe43eae1bc))
* **03-01:** implement create_customer tool ([b93f59c](https://github.com/voyagi/upwork-mcp-server/commit/b93f59cb98adb44660e52be1602961664727a1d1))
* **03-01:** implement update_customer tool ([399917e](https://github.com/voyagi/upwork-mcp-server/commit/399917e41955f3a396f558f2651096ac57710d23))
* **03-02:** add resolution column schema migration ([35b5de0](https://github.com/voyagi/upwork-mcp-server/commit/35b5de0d8135547ffc9f9fb71f90ae382d42ccf3))
* **03-02:** implement create_ticket and close_ticket tools ([04dd7c1](https://github.com/voyagi/upwork-mcp-server/commit/04dd7c17518d2e09e5702eb831a6a8eabd1244d0))
* **03-03:** implement get_summary analytics tool ([e293bb5](https://github.com/voyagi/upwork-mcp-server/commit/e293bb5f44d59ec50973e10c8642ff51cf93abd7))
* **03-03:** register analytics tools in server ([468629a](https://github.com/voyagi/upwork-mcp-server/commit/468629af34446e489d902669ef2c3c491d4dbcea))
* **04-01:** expand seed data to 22 customers, 12 products, 32 tickets ([2040581](https://github.com/voyagi/upwork-mcp-server/commit/20405818f1173184663166f81702fc6056064af1))
* **04-02:** create portfolio-grade README with architecture diagram and demo conversation ([ef29126](https://github.com/voyagi/upwork-mcp-server/commit/ef29126a198d98bdd23e70e9e7c52cac68efe86b))
* improve validation, formatters, and add new tests ([2b6a6f4](https://github.com/voyagi/upwork-mcp-server/commit/2b6a6f4dc1d2540eee56a74f613661f6b082f253))
* scaffold MCP server portfolio project ([d5ccff7](https://github.com/voyagi/upwork-mcp-server/commit/d5ccff79f3ed4e7bee29b5e322f0cb9fc50addf6))


### Bug Fixes

* **04-03:** correct README data inaccuracies and add search_products demo ([fd550f7](https://github.com/voyagi/upwork-mcp-server/commit/fd550f7d24f1a2270ea03ff047360f10ad7ced1f))
* **deps:** patch qs vulnerability (GHSA-w7fw-mjwx-w883) ([293e05b](https://github.com/voyagi/upwork-mcp-server/commit/293e05b9c0f4d0c1c544f8a2d0e57ec67a861e01))
* harden tool handlers from adversarial challenge review ([#7](https://github.com/voyagi/upwork-mcp-server/issues/7)) ([1146e1b](https://github.com/voyagi/upwork-mcp-server/commit/1146e1bc0f19ac6b665dc847ee91b8a7a9446b6e))
* update error messages to reference README instead of setup.md ([c3551ce](https://github.com/voyagi/upwork-mcp-server/commit/c3551ce637bd1399af8876c720cd30619dea1169))
