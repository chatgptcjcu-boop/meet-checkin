(function () {
  'use strict';

  var state = {
    groups: [],
    members: [],
    selectedGroupId: null,
    editingMemberId: null,
    gasUrl: ''
  };

  function gasUrl() {
    if (state.gasUrl) return state.gasUrl;
    var cfg = window.EVENT_CONFIG || {};
    state.gasUrl = (cfg.backend && cfg.backend.gasWebAppUrl) || '';
    return state.gasUrl;
  }

  function rosterAction() {
    return (window.EVENT_CONFIG && window.EVENT_CONFIG.rosterAdmin && window.EVENT_CONFIG.rosterAdmin.action) || 'roster-admin';
  }

  function setStatus(msg, kind) {
    var el = document.getElementById('statusMsg');
    if (!el) return;
    el.className = 'status' + (kind ? ' ' + kind : '');
    el.textContent = msg || '';
  }

  function membersForGroup(groupId) {
    return state.members
      .filter(function (m) { return m.groupId === groupId; })
      .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
  }

  function attBadge(att) {
    if (att === '出席') return '<span class="badge badge-att">出席</span>';
    if (att === '請假') return '<span class="badge badge-leave">請假</span>';
    return '<span class="badge badge-video">視訊</span>';
  }

  function kindBadge(kind) {
    return kind === 'observers'
      ? '<span class="badge badge-observers">列席</span>'
      : '<span class="badge badge-committee">委員</span>';
  }

  function renderGroups() {
    var ul = document.getElementById('groupList');
    if (!state.groups.length) {
      ul.innerHTML = '<li class="empty">尚無群組。按「新增群組」或「初始化種子資料」。</li>';
      return;
    }
    ul.innerHTML = state.groups.map(function (g) {
      var count = membersForGroup(g.groupId).length;
      var active = g.groupId === state.selectedGroupId ? ' active' : '';
      return (
        '<li class="group-item' + active + '" data-group-id="' + g.groupId + '">' +
          '<div class="name">' + g.name + '</div>' +
          '<div class="meta">' + kindBadge(g.rosterKind) +
          (g.committee || '—') + '｜' + count + ' 人<br><code>' + g.groupId + '</code></div>' +
        '</li>'
      );
    }).join('');
  }

  function renderMembers() {
    var wrap = document.getElementById('memberPanel');
    var g = state.groups.find(function (x) { return x.groupId === state.selectedGroupId; });
    if (!g) {
      wrap.innerHTML = '<p class="empty">請從左側選擇群組，或新增群組。</p>';
      return;
    }
    var list = membersForGroup(g.groupId);
    var rows = list.map(function (m, i) {
      var linked = state.members.filter(function (x) { return x.memberId === m.memberId; }).length;
      var linkHint = linked > 1 ? ' <span class="badge badge-observers">連動 ' + linked + ' 群組</span>' : '';
      return (
        '<tr>' +
          '<td>' + (i + 1) + '</td>' +
          '<td><strong>' + m.name + '</strong>' + linkHint + '<br><code style="font-size:0.68rem">' + m.memberId + '</code></td>' +
          '<td>' + (m.org || '—') + '</td>' +
          '<td>' + (m.title || '—') + '</td>' +
          '<td>' + (m.role || '—') + '</td>' +
          '<td>' + attBadge(m.attendance) + '</td>' +
          '<td class="row-actions">' +
            '<button type="button" data-edit-member="' + m.memberId + '">編輯</button>' +
            '<button type="button" data-delete-member="' + m.memberId + '">刪除</button>' +
          '</td>' +
        '</tr>'
      );
    }).join('');

    wrap.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem">' +
        '<div><h2 style="margin:0 0 0.25rem;border:none;padding:0">' + g.name + '</h2>' +
        '<div class="meta-pill" style="display:inline-block">' + kindBadge(g.rosterKind) + ' <code>' + g.groupId + '</code></div></div>' +
        '<div class="toolbar">' +
          '<button type="button" id="btnEditGroup">編輯群組</button>' +
          '<button type="button" id="btnDeleteGroup" class="danger">刪除群組</button>' +
        '</div>' +
      '</div>' +
      (list.length
        ? '<table><thead><tr><th>#</th><th>姓名</th><th>單位</th><th>職稱</th><th>身份</th><th>出席</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table>'
        : '<p class="empty">此群組尚無成員。請新增或使用批次貼上。</p>') +
      '<div class="note">刪除成員會依 <code>memberId</code> 連動移除所有群組中的同一引用列；編輯亦會同步更新。</div>';
  }

  async function loadRoster() {
    var url = gasUrl();
    if (!url) {
      setStatus('尚未設定 GAS URL（config/event.config.json → backend.gasWebAppUrl）', 'err');
      return;
    }
    setStatus('載入中…', '');
    try {
      var res = await fetch(url + '?action=roster', { method: 'GET', cache: 'no-cache' });
      var json = await res.json();
      if (!json.ok) throw new Error(json.error || '載入失敗');
      state.groups = json.groups || [];
      state.members = json.members || [];
      if (!state.selectedGroupId && state.groups.length) {
        state.selectedGroupId = state.groups[0].groupId;
      }
      renderGroups();
      renderMembers();
      setStatus('已載入 ' + state.groups.length + ' 個群組、' + state.members.length + ' 筆成員列', 'ok');
    } catch (e) {
      setStatus('載入失敗：' + e.message + '（若 GAS 尚未部署 roster 功能，請重新部署 Code.gs）', 'err');
    }
  }

  async function postOp(payload) {
    var url = gasUrl();
    if (!url) throw new Error('尚未設定 GAS URL');
    payload.action = rosterAction();
    payload.timestamp = new Date().toISOString();
    payload.pageUrl = location.href;
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  function openModal(id) {
    document.getElementById(id).classList.add('open');
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove('open');
  }

  function fillMemberForm(m) {
    document.getElementById('memberName').value = m ? m.name : '';
    document.getElementById('memberOrg').value = m ? m.org : '';
    document.getElementById('memberTitle').value = m ? m.title : '';
    document.getElementById('memberRole').value = m ? m.role : '';
    document.getElementById('memberAttendance').value = m ? m.attendance : '出席';
  }

  function getMemberForm() {
    return {
      name: document.getElementById('memberName').value.trim(),
      org: document.getElementById('memberOrg').value.trim(),
      title: document.getElementById('memberTitle').value.trim(),
      role: document.getElementById('memberRole').value.trim(),
      attendance: document.getElementById('memberAttendance').value
    };
  }

  document.getElementById('btnReload').addEventListener('click', loadRoster);

  document.getElementById('btnSeed').addEventListener('click', async function () {
    if (!confirm('寫入 730／630 預設群組與名單？若已有資料將略過（除非試算表為空）。')) return;
    try {
      var json = await postOp({ operation: 'seed', force: false });
      if (!json.ok) throw new Error(json.error || '種子失敗');
      setStatus('種子完成：' + json.groups + ' 群組、' + json.members + ' 成員', 'ok');
      await loadRoster();
    } catch (e) {
      setStatus('種子失敗：' + e.message, 'err');
    }
  });

  document.getElementById('btnAddGroup').addEventListener('click', function () {
    document.getElementById('groupFormTitle').textContent = '新增群組';
    document.getElementById('editGroupId').value = '';
    document.getElementById('groupId').value = '';
    document.getElementById('groupId').disabled = false;
    document.getElementById('groupName').value = '';
    document.getElementById('groupCommittee').value = '教材編審委員會';
    document.getElementById('groupKind').value = 'committee';
    document.getElementById('groupSort').value = String(state.groups.length + 1);
    document.getElementById('groupDesc').value = '';
    openModal('groupModal');
  });

  document.getElementById('btnSaveGroup').addEventListener('click', async function () {
    var isEdit = !!document.getElementById('editGroupId').value;
    var payload = {
      operation: isEdit ? 'updateGroup' : 'createGroup',
      groupId: (document.getElementById('groupId').value.trim() || document.getElementById('editGroupId').value),
      name: document.getElementById('groupName').value.trim(),
      committee: document.getElementById('groupCommittee').value,
      rosterKind: document.getElementById('groupKind').value,
      sortOrder: Number(document.getElementById('groupSort').value) || 0,
      description: document.getElementById('groupDesc').value.trim()
    };
    if (!payload.name) { alert('請填群組名稱'); return; }
    try {
      var json = await postOp(payload);
      if (!json.ok) throw new Error(json.error);
      closeModal('groupModal');
      if (!isEdit) state.selectedGroupId = json.groupId;
      await loadRoster();
      setStatus(isEdit ? '群組已更新' : '群組已建立', 'ok');
    } catch (e) {
      alert(e.message);
    }
  });

  document.getElementById('btnAddMember').addEventListener('click', function () {
    if (!state.selectedGroupId) { alert('請先選擇群組'); return; }
    state.editingMemberId = null;
    document.getElementById('memberFormTitle').textContent = '新增成員';
    fillMemberForm(null);
    openModal('memberModal');
  });

  document.getElementById('btnSaveMember').addEventListener('click', async function () {
    if (!state.selectedGroupId) return;
    var form = getMemberForm();
    if (!form.name) { alert('請填姓名'); return; }
    try {
      var payload = Object.assign({ operation: state.editingMemberId ? 'updateMember' : 'createMember' }, form);
      if (state.editingMemberId) {
        payload.memberId = state.editingMemberId;
      } else {
        payload.groupId = state.selectedGroupId;
      }
      var json = await postOp(payload);
      if (!json.ok) throw new Error(json.error);
      closeModal('memberModal');
      await loadRoster();
      setStatus(state.editingMemberId ? '成員已更新（連動同步）' : '成員已新增', 'ok');
    } catch (e) {
      alert(e.message);
    }
  });

  document.getElementById('btnBulkImport').addEventListener('click', async function () {
    if (!state.selectedGroupId) { alert('請先選擇群組'); return; }
    var text = document.getElementById('pasteText').value.trim();
    if (!text) { alert('請貼上名單'); return; }
    try {
      var json = await postOp({
        operation: 'bulkImport',
        groupId: state.selectedGroupId,
        text: text,
        defaultRole: document.getElementById('pasteDefaultRole').value.trim(),
        defaultAttendance: document.getElementById('pasteDefaultAtt').value
      });
      if (!json.ok) throw new Error(json.error);
      document.getElementById('pasteText').value = '';
      await loadRoster();
      setStatus('已匯入 ' + json.added + ' 人', 'ok');
    } catch (e) {
      setStatus('匯入失敗：' + e.message, 'err');
    }
  });

  document.getElementById('groupList').addEventListener('click', function (e) {
    var li = e.target.closest('.group-item[data-group-id]');
    if (!li) return;
    state.selectedGroupId = li.getAttribute('data-group-id');
    renderGroups();
    renderMembers();
  });

  document.getElementById('memberPanel').addEventListener('click', async function (e) {
    var editId = e.target.getAttribute('data-edit-member');
    var delId = e.target.getAttribute('data-delete-member');
    if (editId) {
      var m = state.members.find(function (x) { return x.memberId === editId; });
      state.editingMemberId = editId;
      document.getElementById('memberFormTitle').textContent = '編輯成員（連動更新）';
      fillMemberForm(m);
      openModal('memberModal');
      return;
    }
    if (delId) {
      var linked = state.members.filter(function (x) { return x.memberId === delId; }).length;
      var msg = linked > 1
        ? '此成員在 ' + linked + ' 個群組中有引用，刪除將全部移除。確定？'
        : '確定刪除此成員？';
      if (!confirm(msg)) return;
      try {
        var json = await postOp({ operation: 'deleteMember', memberId: delId });
        if (!json.ok) throw new Error(json.error);
        await loadRoster();
        setStatus('已刪除（連動 ' + (json.deletedRows || 1) + ' 列）', 'ok');
      } catch (err) {
        setStatus('刪除失敗：' + err.message, 'err');
      }
      return;
    }
    if (e.target.id === 'btnEditGroup') {
      var g = state.groups.find(function (x) { return x.groupId === state.selectedGroupId; });
      if (!g) return;
      document.getElementById('groupFormTitle').textContent = '編輯群組';
      document.getElementById('editGroupId').value = g.groupId;
      document.getElementById('groupId').value = g.groupId;
      document.getElementById('groupId').disabled = true;
      document.getElementById('groupName').value = g.name;
      document.getElementById('groupCommittee').value = g.committee;
      document.getElementById('groupKind').value = g.rosterKind;
      document.getElementById('groupSort').value = String(g.sortOrder || 0);
      document.getElementById('groupDesc').value = g.description || '';
      openModal('groupModal');
    }
    if (e.target.id === 'btnDeleteGroup') {
      if (!confirm('刪除群組將一併刪除其所有成員列。確定？')) return;
      try {
        var json2 = await postOp({ operation: 'deleteGroup', groupId: state.selectedGroupId });
        if (!json2.ok) throw new Error(json2.error);
        state.selectedGroupId = null;
        await loadRoster();
        setStatus('群組已刪除', 'ok');
      } catch (err2) {
        setStatus('刪除失敗：' + err2.message, 'err');
      }
    }
  });

  document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeModal(btn.getAttribute('data-close-modal'));
    });
  });

  loadRoster();
})();
