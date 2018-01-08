import settingsMenu from '@/lib/settings-menu';
import { Paginator } from '@/lib/pagination';
import template from './list.html';

function UsersCtrl(currentUser, User) {
  this.currentUser = currentUser;
  this.users = new Paginator([], { itemsPerPage: 20 });
  User.query((users) => {
    this.users.updateRows(users);
  });
}

export default function init(ngModule) {
  settingsMenu.add({
    permission: 'list_users',
    title: 'Users',
    path: 'users',
    order: 2,
  });


  ngModule.component('usersListPage', {
    controller: UsersCtrl,
    template,
  });

  return {
    '/users': {
      template: '<users-list-page></users-list-page>',
      title: 'Users',
    },
  };
}
