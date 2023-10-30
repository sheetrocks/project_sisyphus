export enum Method {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH",
}

export type Request = {
    method: Method;
    user: {
        email: string;
        name: string;
    };
    query: {
        taskID? :string;
    };
    body: {
        newTaskText: string;
    };
};

export enum AccessError {
    NO_USER = "NO_USER",
    NOT_AUTHORIZED = "NOT_AUTHORIZED",
    SYSTEM_ERROR = "SYSTEM_ERROR",
}

export type User = {
    email: string;
    name : string;
};

export type Task = {
    id: string;
    email: string;
    text: string;
    completed: boolean;
    newlyGenerated: boolean;
    createdAt: string;
  }