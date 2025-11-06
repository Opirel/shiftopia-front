import axios from 'axios';

export function useAxois() {
    const API_BASE_URL = 'http://localhost:8080';
    const instance=  (params:object)=> {
        return axios.create({
                                baseURL: API_BASE_URL,
                                timeout: 1000,
                                params
                            });
    }

      return {
        instance
  }
}