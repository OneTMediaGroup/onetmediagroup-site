# Floor Flow Demo Restrictions Patch

Issue fixed:
- Demo plants could be used like a full free production plant.

Added:
- `js/demo-restrictions.js`
- Demo banner in Admin tools.
- Demo blocks for production-building actions.

Demo plants now block:
- Create Area
- Delete Area
- Create Work Cell
- Delete Work Cell
- Create User
- Import Users
- Delete User
- Create/Edit/Delete Parts
- Import Parts

Demo plants still allow:
- Viewing demo data
- Opening Admin, Supervisor, Display Board, Floor Board, Reports
- Testing existing demo users/work cells
- Editing some existing labels/settings for exploration

Production plants are unchanged.

Test checklist:
1. Open Demo Plant Admin.
2. Confirm Demo Plant notice appears.
3. Try adding a user, area, work cell, and part.
4. Expected: blocked with upgrade/demo message.
5. Open Pro Plant Admin.
6. Expected: all normal add/edit flows still work.
