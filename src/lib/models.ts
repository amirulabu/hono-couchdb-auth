import type Nano from "nano";

interface NamesAndRoles {
  names: string[];
  roles: string[];
}

interface iUserSecurity extends Nano.MaybeDocument {
  admins: NamesAndRoles;
  members: NamesAndRoles;
}

export class UserSecurity implements iUserSecurity {
  _id: string | undefined;
  _rev: string | undefined;
  admins: NamesAndRoles;
  members: NamesAndRoles;

  constructor(
    admins: {
      names: string[];
      roles: string[];
    },
    members: {
      names: string[];
      roles: string[];
    }
  ) {
    this._id = undefined;
    this._rev = undefined;
    this.admins = admins;
    this.members = members;
  }

  processAPIResponse(response: Nano.DocumentInsertResponse) {
    if (response.ok === true) {
      this._id = response.id;
      this._rev = response.rev;
    }
  }
}
