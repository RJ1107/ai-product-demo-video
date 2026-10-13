import {recordDemo} from './capture.mjs';

await recordDemo(async ({page,scene})=>{
  await scene('overview',async()=>{
    // Replace with real, verified actions and assertions for this application.
    // Example: await page.getByRole('button',{name:'Save',exact:true}).click();
    //          await page.getByText('Saved successfully',{exact:true}).waitFor();
    throw new Error('Inspect the actual application and implement this recording scene before running.');
  });
});
