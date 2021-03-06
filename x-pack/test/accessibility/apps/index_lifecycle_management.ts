/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

const TEST_POLICY_NAME = 'ilm-a11y-test';
const TEST_POLICY_ALL_PHASES = {
  policy: {
    phases: {
      hot: {
        actions: {},
      },
      warm: {
        actions: {},
      },
      cold: {
        actions: {},
      },
      delete: {
        actions: {},
      },
    },
  },
};

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, indexLifecycleManagement } = getPageObjects([
    'common',
    'indexLifecycleManagement',
  ]);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const esClient = getService('es');
  const a11y = getService('a11y');

  const findPolicyLinkInListView = async (policyName: string) => {
    const links = await testSubjects.findAll('policyTablePolicyNameLink');
    for (const link of links) {
      const name = await link.getVisibleText();
      if (name === policyName) {
        return link;
      }
    }
    throw new Error(`Could not find ${policyName} in policy table`);
  };

  describe('Index Lifecycle Management', async () => {
    before(async () => {
      await esClient.ilm.putLifecycle({ policy: TEST_POLICY_NAME, body: TEST_POLICY_ALL_PHASES });
      await common.navigateToApp('indexLifecycleManagement');
    });

    after(async () => {
      await esClient.ilm.deleteLifecycle({ policy: TEST_POLICY_NAME });
    });

    it('Create Policy Form', async () => {
      await retry.waitFor('Index Lifecycle Policy create/edit view to be present', async () => {
        return testSubjects.isDisplayed('createPolicyButton');
      });

      // Navigate to create policy page and take snapshot
      await testSubjects.click('createPolicyButton');
      await retry.waitFor('Index Lifecycle Policy create/edit view to be present', async () => {
        return (await testSubjects.getVisibleText('policyTitle')) === 'Create policy';
      });

      // Fill out form after enabling all phases and take snapshot.
      await indexLifecycleManagement.fillNewPolicyForm('testPolicy', true, true, false);
      await a11y.testAppSnapshot();
    });

    it('Send Request Flyout on New Policy Page', async () => {
      // Take snapshot of the show request panel
      await testSubjects.click('requestButton');
      await a11y.testAppSnapshot();

      // Close panel and save policy
      await testSubjects.click('euiFlyoutCloseButton');
      await indexLifecycleManagement.saveNewPolicy();
    });

    it('List policies view', async () => {
      await retry.waitFor('Index Lifecycle Policy create/edit view to be present', async () => {
        await common.navigateToApp('indexLifecycleManagement');
        return testSubjects.exists('policyTablePolicyNameLink') ? true : false;
      });
      await a11y.testAppSnapshot();
    });

    it('Edit policy with all phases view', async () => {
      await retry.waitFor('Index Lifecycle Policy create/edit view to be present', async () => {
        await common.navigateToApp('indexLifecycleManagement');
        return testSubjects.exists('policyTablePolicyNameLink');
      });
      const link = await findPolicyLinkInListView(TEST_POLICY_NAME);
      await link.click();
      await retry.waitFor('Index Lifecycle Policy create/edit view to be present', async () => {
        return testSubjects.exists('policyTitle');
      });
      await a11y.testAppSnapshot();
    });
  });
}
