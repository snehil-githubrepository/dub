import { withWorkspace } from "@/lib/auth";
import {
  determineFolderUserRole,
  throwIfFolderActionDenied,
} from "@/lib/link-folder/permissions";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/folders/[folderId]/users – get users with access to a folder
export const GET = withWorkspace(
  async ({ params, workspace, session }) => {
    const { folderId } = params;

    const folder = await throwIfFolderActionDenied({
      folderId,
      workspaceId: workspace.id,
      userId: session.user.id,
      requiredPermission: "folders.read",
    });

    const [workspaceUsers, folderUsers] = await Promise.all([
      prisma.projectUsers.findMany({
        where: {
          projectId: workspace.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),

      prisma.folderUser.findMany({
        where: {
          folderId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),
    ]);

    const users = workspaceUsers.map(({ user }) => {
      const folderUser =
        folderUsers.find((folderUser) => folderUser.userId === user.id) || null;

      const role = determineFolderUserRole({
        folder: {
          ...folder,
          user: folderUser,
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role,
      };
    });

    return NextResponse.json(users);
  },
  {
    requiredPermissions: ["folders.read"],
  },
);