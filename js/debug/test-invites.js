/**
 * Test script for Telecom invite functionality
 * Run in browser console after Telecom app is loaded
 * 
 * Usage:
 *   // Load the script
 *   const script = document.createElement('script');
 *   script.src = 'js/debug/test-invites.js';
 *   document.head.appendChild(script);
 * 
 *   // Run tests
 *   testInvites();
 */

window.testInvites = function() {
  console.log('=== Testing Telecom Invites ===\n');
  
  const STORAGE_KEY = 'webos.telecom.v1';
  const CONTACTS_STORAGE_KEY = 'webos.telecom.contacts.v1';
  
  // Get current config
  let config = {};
  try {
    const configData = localStorage.getItem(STORAGE_KEY);
    if (configData) {
      config = JSON.parse(configData);
    }
  } catch (e) {
    console.error('Error loading config:', e);
    return;
  }
  
  // Get effective GUID
  const effectiveGuid = config.guidType === 'application' && config.applicationGuid 
    ? config.applicationGuid 
    : (config.systemGuid || 'test-guid-' + Date.now());
  
  const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${effectiveGuid}`;
  const TEST_TARGET_GUID = 'test-target-guid-' + Date.now();
  
  console.log('Test GUID:', effectiveGuid);
  console.log('Target GUID:', TEST_TARGET_GUID);
  console.log('Storage key:', SENT_INVITES_STORAGE_KEY);
  console.log('');
  
  // Test 1: Check initial state
  console.log('Test 1: Check initial state');
  let sentInvites = [];
  try {
    const existingSentInvites = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
    if (existingSentInvites) {
      sentInvites = JSON.parse(existingSentInvites);
    }
  } catch (e) {
    console.error('Error loading sent invites:', e);
  }
  const initialPendingCount = sentInvites.filter(inv => inv.status === 'pending').length;
  console.log('Initial pending invites:', initialPendingCount);
  console.log('✓\n');
  
  // Test 2: Create a test invite
  console.log('Test 2: Create a test invite');
  const testInvite = {
    id: 'test-invite-' + Date.now(),
    fromGuid: effectiveGuid,
    toGuid: TEST_TARGET_GUID,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
  
  sentInvites.push(testInvite);
  localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(sentInvites));
  console.log('Created invite:', testInvite.id);
  
  // Verify it was added
  const afterAdd = JSON.parse(localStorage.getItem(SENT_INVITES_STORAGE_KEY));
  const foundInvite = afterAdd.find(inv => inv.id === testInvite.id);
  if (foundInvite) {
    console.log('✓ Invite added successfully');
  } else {
    console.error('✗ Failed to add invite');
    return;
  }
  console.log('');
  
  // Test 3: Check for duplicate (should find it)
  console.log('Test 3: Check for duplicate invite');
  const hasPending = afterAdd.some(inv => 
    inv.status === 'pending' && inv.toGuid === TEST_TARGET_GUID
  );
  if (hasPending) {
    console.log('✓ Duplicate check works - found pending invite');
  } else {
    console.error('✗ Duplicate check failed - should find pending invite');
  }
  console.log('');
  
  // Test 4: Cancel the invite
  console.log('Test 4: Cancel the invite');
  const invitesAfterCancel = JSON.parse(localStorage.getItem(SENT_INVITES_STORAGE_KEY));
  const inviteIndex = invitesAfterCancel.findIndex(inv => inv.id === testInvite.id);
  
  if (inviteIndex === -1) {
    console.error('✗ Invite not found for cancellation');
    return;
  }
  
  invitesAfterCancel.splice(inviteIndex, 1);
  localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(invitesAfterCancel));
  console.log('Removed invite:', testInvite.id);
  
  // Verify it was removed
  const afterCancel = JSON.parse(localStorage.getItem(SENT_INVITES_STORAGE_KEY));
  const stillExists = afterCancel.find(inv => inv.id === testInvite.id);
  if (!stillExists) {
    console.log('✓ Invite removed successfully');
  } else {
    console.error('✗ Failed to remove invite');
    return;
  }
  console.log('');
  
  // Test 5: Check for duplicate after cancel (should NOT find it)
  console.log('Test 5: Check for duplicate after cancel');
  const hasPendingAfterCancel = afterCancel.some(inv => 
    inv.status === 'pending' && inv.toGuid === TEST_TARGET_GUID
  );
  if (!hasPendingAfterCancel) {
    console.log('✓ Duplicate check works - no pending invite found (correct)');
  } else {
    console.error('✗ Duplicate check failed - found pending invite when it should be removed');
  }
  console.log('');
  
  // Test 6: Test getPendingInvites function
  console.log('Test 6: Test getPendingInvites function');
  if (typeof window.getPendingInvites === 'function') {
    const pendingInvites = window.getPendingInvites(effectiveGuid);
    const testInviteInList = pendingInvites.find(inv => inv.id === testInvite.id);
    if (!testInviteInList) {
      console.log('✓ getPendingInvites correctly excludes canceled invite');
    } else {
      console.error('✗ getPendingInvites still includes canceled invite');
    }
  } else {
    console.log('⚠ getPendingInvites function not available (need to expose it or test manually)');
  }
  console.log('');
  
  // Summary
  console.log('=== Test Summary ===');
  console.log('Initial pending:', initialPendingCount);
  console.log('After add:', afterAdd.filter(inv => inv.status === 'pending').length);
  console.log('After cancel:', afterCancel.filter(inv => inv.status === 'pending').length);
  console.log('');
  console.log('All tests completed!');
  
  // Cleanup: restore original state
  const originalInvites = sentInvites.filter(inv => inv.id !== testInvite.id);
  localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(originalInvites));
  console.log('✓ Cleaned up test data');
};

// Also expose helper function to test duplicate check logic
window.testDuplicateCheck = function(targetGuid) {
  const STORAGE_KEY = 'webos.telecom.v1';
  
  // Get config
  let config = {};
  try {
    const configData = localStorage.getItem(STORAGE_KEY);
    if (configData) {
      config = JSON.parse(configData);
    }
  } catch (e) {
    console.error('Error loading config:', e);
    return;
  }
  
  // Get effective GUID
  const effectiveGuid = config.guidType === 'application' && config.applicationGuid 
    ? config.applicationGuid 
    : (config.systemGuid || 'unknown');
  
  const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${effectiveGuid}`;
  
  console.log('Checking for pending invites to:', targetGuid);
  console.log('Using GUID:', effectiveGuid);
  console.log('Storage key:', SENT_INVITES_STORAGE_KEY);
  
  let sentInvites = [];
  try {
    const existingSentInvites = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
    if (existingSentInvites) {
      sentInvites = JSON.parse(existingSentInvites);
    }
  } catch (e) {
    console.error('Error loading sent invites:', e);
    return;
  }
  
  console.log('Total invites:', sentInvites.length);
  console.log('Pending invites:', sentInvites.filter(inv => inv.status === 'pending').length);
  
  const pendingToTarget = sentInvites.filter(inv => 
    inv.status === 'pending' && inv.toGuid === targetGuid
  );
  
  console.log('Pending invites to', targetGuid + ':', pendingToTarget.length);
  if (pendingToTarget.length > 0) {
    console.log('Invites:', pendingToTarget.map(inv => ({
      id: inv.id,
      toGuid: inv.toGuid,
      status: inv.status,
      timestamp: inv.timestamp
    })));
  }
  
  return pendingToTarget.length > 0;
};
