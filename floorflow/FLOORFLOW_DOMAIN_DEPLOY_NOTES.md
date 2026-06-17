# Floor Flow domain deploy notes

Target launch path:

```text
https://onetmediagroup.ca/floorflow/
```

Public marketing page remains on the main company website:

```text
https://onetmediagroup.ca/floor-flow.html
```

System/app pages should live inside the `/floorflow/` folder:

```text
https://onetmediagroup.ca/floorflow/onboarding.html
https://onetmediagroup.ca/floorflow/admin.html?plantId=PLANT_CODE
https://onetmediagroup.ca/floorflow/supervisor.html?plantId=PLANT_CODE
https://onetmediagroup.ca/floorflow/display.html?plantId=PLANT_CODE
https://onetmediagroup.ca/floorflow/board.html?plantId=PLANT_CODE
```

Plant links now generate customer-facing URLs using `?plantId=...`.
Older `?plant=...` links still work for backward compatibility.

Stripe checkout success/cancel URLs are built from the current page URL, so hosting under `/floorflow/` keeps the return flow on the same domain/path.
