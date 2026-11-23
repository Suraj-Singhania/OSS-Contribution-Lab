import z from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const projectRouter = createTRPCRouter({
  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        githubUrl: z.string(),
        apiKey: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.create({
        data: {
          name: input.name,
          githubUrl: input.githubUrl,
          apiKey: input.apiKey,
          userToProjects: {
            create: {
              userId: ctx.userId,
            },
          },
        },
      });
      return project;
    }),
  getProjects: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.project.findMany({
      where: {
        userToProjects: {
          some: {
            userId: ctx.userId,
          },
        },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        githubUrl: true,
      },
    });
  }),
  deleteProject: protectedProcedure
    .input(z.object({ projectId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.userToProject.findUnique({
        where: {
          userId_projecteId: {
            userId: ctx.userId,
            projecteId: input.projectId,
          },
        },
        select: { id: true },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }

      return ctx.db.project.update({
        where: { id: input.projectId },
        data: { deletedAt: new Date() },
        select: { id: true, name: true },
      });
    }),
});
