import {defineQualityConfig} from '@saplings/quality-core';
export default defineQualityConfig({name:'frontend-only',environment:'local',frontend:{baseUrl:'http://127.0.0.1:5173',routes:['/'],bundle:{directory:'apps/web/dist',maxTotalGzipKb:350}}});
