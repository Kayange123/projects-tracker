import { ProjectForm } from "@/constants/common.types";
import { createProjectMutation, createUserMutation, deleteProjectMutation, getProjectByIdQuery, getProjectsOfUserQuery, getUserQuery, projectsQuery, updateProjectMutation } from "@/graphql/grapqlQueryAndMutation";
import { GraphQLClient } from "graphql-request";
import { isBase64DataURL } from "./isBase64DataUrl";

const isProduction = process.env.NODE_ENV === 'production';
const apiKey = isProduction ? process.env.NEXT_PUBLIC_GRAFBASE_API_KEY || '' : 'letmein';
const apiUrl = isProduction ? process.env. NEXT_PUBLIC_GRAFBASE_API || '' : 'http://127.0.0.1:4000/graphql';
const serverUrl = isProduction ? process.env.NEXT_PUBLIC_SERVER_URL : 'http://localhost:3000';


const client = new GraphQLClient(apiUrl);
export const makeGraphqlRequest = async (query: string, variables = {}) =>{
    
    try {
        return await client.request(query, variables);
        
    } catch (error) {
        //console.error('GraphQL request '+error);
    }
}

// Retrieve user from database
export async function fetchUser(email: string){
    //return makeGraphqlRequest(getUserQuery, {email});
    return await makeGraphqlRequest(getUserQuery, {email});
}


//Fetch Token
export const fetchToken = async ()=>{
    const res = await fetch(`${serverUrl}/api/auth/token`)
    return res.json();
}

//Upload image to cloudinary and get back the url
export const uploadImage =  async (imagePath: string)=>{
    try {
        const res = await fetch(`${serverUrl}/api/upload`,{
            method: 'POST',
            body: JSON.stringify({path: imagePath})
        })
        return res.json()
    } catch (error) {
        throw new Error('Error uploading image');
    }
}

// Create the project
export async function createProject (form: ProjectForm, creatorId: string, token: string) {
    const imageUrl = await uploadImage(form?.images[0]);
    if(imageUrl.url){
        client.setHeader('Authorization', `Bearer ${token}`);
        const variables = {
            input: {...form, image: imageUrl.url, createdBy : { link: creatorId} }
        }
        makeGraphqlRequest(createProjectMutation, variables);
    }
}

//Fetch all posts
export function fetchAllProjects(category?: string, endCursor?: string){
    client.setHeader('x-api-key',apiKey);
    return  makeGraphqlRequest(projectsQuery, { category, endCursor})
}

//Fetch the project by an ID
export function fetchProjectDetails(id: string) {
    client.setHeader('x-api-key',apiKey);
    return makeGraphqlRequest(getProjectByIdQuery, {id} );
}

//Fetch projects by specific user
export function fetchUserProjects(id:string, last?: number) {
    client.setHeader('x-api-key',apiKey);
    return makeGraphqlRequest(getProjectsOfUserQuery, {id, last}) 
}

//Delete project by an ID
export async function deleteProject(id:string, token:string) {
    client.setHeader('Authorization', 'Bearer ' + token);
    return await makeGraphqlRequest(deleteProjectMutation, {id})
}

//Update project 
export async function updateProject(form: any ,projectId:string, token:string) {
    let updatedForm = {...form};

    //Checks if the image is base64
    const isNewImage: boolean = isBase64DataURL(form?.image);

    //If it's base64 upload it to claudinary -> otherwise it is the same image 
    if(isNewImage){
        const imageUrl = await uploadImage(form.image);
        //Update the form with new image url
        if(imageUrl?.url){
            updatedForm = {
                ...form,
                image: imageUrl?.url
            }  
        }
    }
    const variables = {
        id: projectId,
        input: updatedForm
    }

    client.setHeader('Authorization', 'Bearer ' + token);
    return await makeGraphqlRequest(updateProjectMutation, variables)
}